/// <reference lib="webworker" />
import { refreshAccessToken } from '~/api/client';
import type { Entity, MutationOp } from './types';
import type { WorkerMessage, MainMessage, Update } from './types';

declare const self: ServiceWorkerGlobalScope;

let API_BASE = '';
let AUTH_TOKEN = '';
let REFRESH_TOKEN = '';
let CLIENT_ID = '';

let isOnline = navigator.onLine;

// State
let isSyncing = false;
let pendingMutations: MutationOp[] = [];
let latestVersion = 0;

// Helpers to post back to main

const post = (msg: MainMessage) => {
  postMessage(msg);
};

// Listen to network status
self.addEventListener('online', () => {
  isOnline = true;
  post({ type: 'STATUS', status: 'idle', online: true });
  flushMutations();
  connectSSE(); // Reconnect SSE
});
self.addEventListener('offline', () => {
  isOnline = false;
  post({ type: 'STATUS', status: 'idle', online: false });
  if (sseSource) sseSource.close();
});

let sseSource: EventSource | null = null;
let sseRetryTimeout: any = null;
let retryCount = 0;

// Signal to wake up the sync processor
let wakeSync: (() => void) | null = null;

const triggerSync = () => {
  if (wakeSync) wakeSync();
};

const connectSSE = () => {
  if (sseSource || !isOnline) return;

  // Clear any pending retries if we are connecting manually
  if (sseRetryTimeout) clearTimeout(sseRetryTimeout);

  const url = `${API_BASE}/v1/events?token=${AUTH_TOKEN}`;
  console.log('Worker: Connecting SSE...', url);
  sseSource = new EventSource(url);

  sseSource.onopen = () => {
    console.log('Worker: SSE Connected');
    retryCount = 0; // Reset backoff
    post({ type: 'STATUS', status: 'idle', online: true });
    // Trigger a sync immediately on connect to catch up
    triggerSync();
  };

  sseSource.onmessage = (event) => {
    const version = parseInt(event.data, 10);
    if (!isNaN(version) && version > latestVersion) {
      console.log('Worker: SSE Update Signal', version);
      triggerSync();
    }
  };

  sseSource.onerror = () => {
    console.warn('Worker: SSE Disconnected');
    sseSource?.close();
    sseSource = null;

    if (isOnline) {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      retryCount++;
      console.log(`Worker: Reconnecting SSE in ${delay}ms...`);
      sseRetryTimeout = setTimeout(connectSSE, delay);
    }
  };
};

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    API_BASE = msg.apiUrl;
    AUTH_TOKEN = msg.jid;
    REFRESH_TOKEN = msg.rid;
    CLIENT_ID = msg.clientId;

    // We start from 0 to fetch full state on load
    latestVersion = 0;
    
    // Clear pending mutations on init (fresh start)
    // Or we could try to keep them if we suspect a reload, but for now let's clear to avoid stale state issues
    pendingMutations = [];

    connectSSE();
    startSyncProcessor();
    if (isOnline) flushMutations();
  } else if (msg.type === 'MUTATE') {
    pendingMutations.push({
      ...msg.mutation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    if (isOnline) flushMutations();
    triggerSync(); // Optimistic local update trigger
  }
});

const headers = () => ({
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
});

// Replaces the old loop. This waits for a signal.
const startSyncProcessor = async () => {
  if (isSyncing) return;
  isSyncing = true;

  while (true) {
    // 1. Wait for signal (or flush if just started)
    await new Promise<void>((resolve) => {
      wakeSync = resolve;
    });
    wakeSync = null; // Reset signal

    if (!isOnline) {
      continue;
    }

    try {
      post({ type: 'STATUS', status: 'syncing', online: true });

      // Perform Standard Fetch (wait=0)
      const res = await fetch(
        `${API_BASE}/v1/sync?since=${latestVersion}&wait=0`,
        { headers: headers() },
      );

      if (res.status === 401) {
        post({ type: 'STATUS', status: 'error', online: true });
        // Maybe pause or re-auth? For now just wait for next signal
        continue;
      }

      if (!res.ok) throw new Error('Sync failed');

      const data = await res.json();

      if (data.changes && data.changes.length > 0) {
        const updates: Update[] = [];

        for (const change of data.changes) {
          if (change.op === 'upsert') {
            updates.push({
              op: 'upsert',
              type: change.entityType,
              id: change.entityId,
              data: change.data,
            });
          } else if (change.op === 'delete') {
            updates.push({
              op: 'delete',
              type: change.entityType,
              id: change.entityId,
            });
          }
        }

        // Update memory version
        latestVersion = data.version;

        post({ type: 'UPDATE', ops: updates });
      }

      post({ type: 'STATUS', status: 'idle', online: true });
    } catch (e) {
      console.error('Worker: Sync error', e);
      post({ type: 'STATUS', status: 'error', online: isOnline });
      // On error, we might want to try again shortly?
      // Or just wait for the next SSE reconnection/event.
      // Let's rely on SSE retry to trigger us again if needed.
    }
  }
};

const flushMutations = async () => {
  if (!isOnline) return;

  if (pendingMutations.length === 0) return;

  // Take a snapshot of current mutations to send
  const mutationsToSend = [...pendingMutations];

  try {
    const payload = {
      clientId: CLIENT_ID,
      mutations: mutationsToSend.map((p) => ({
        op: p.op,
        type: p.type,
        id: p.entityId,
        data: p.data,
        baseUpdatedAt: p.baseUpdatedAt,
      })),
    };

    const res = await fetch(`${API_BASE}/v1/mutate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
        // Remove successfully sent mutations from the pending queue
        // We filter out any mutation whose ID was in the batch we just sent
        const sentIds = new Set(mutationsToSend.map(m => m.id));
        pendingMutations = pendingMutations.filter(m => !sentIds.has(m.id));
    } else {
      console.warn('Worker: Mutate failed', res.status);
    }
  } catch (e) {
    console.error('Worker: Flush failed', e);
  }
};
