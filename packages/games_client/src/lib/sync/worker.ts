/// <reference lib="webworker" />
import {
  getEntities,
  saveEntities,
  queueMutation,
  getPendingMutations,
  clearPendingMutations,
  removeMutation,
  removeEntityFromCache,
} from './db';
import type { Entity } from './db';
import type { WorkerMessage, MainMessage, Update } from './types';

declare const self: ServiceWorkerGlobalScope;

let API_BASE = '';
let AUTH_TOKEN = '';
let CLIENT_ID = '';

let isOnline = navigator.onLine;

// State
let isSyncing = false;

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
let latestVersion = 0;
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
      console.log('getting here')
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
    console.log('[WORKER][INIT]: ', msg)
    API_BASE = msg.apiUrl;
    AUTH_TOKEN = msg.token;
    CLIENT_ID = msg.clientId;

    // Load initial state with pending mutations applied
    try {
      const entities = await getEntities();
      const pending = await getPendingMutations();

      const entityMap = new Map(entities.map((e) => [`${e.type}:${e.id}`, e]));

      for (const m of pending) {
        const key = `${m.type}:${m.entityId}`;
        if (m.op === 'upsert') {
          entityMap.set(key, {
            namespace: 'local',
            type: m.type,
            id: m.entityId,
            data: m.data,
            updatedAt: m.baseUpdatedAt || Date.now(),
            updatedBy: CLIENT_ID,
          });
        } else if (m.op === 'delete') {
          entityMap.delete(key);
        }
      }

      post({ type: 'SNAPSHOT', entities: Array.from(entityMap.values()) });
    } catch (e) {
      console.error('Worker: Failed to load cache', e);
    }

    // connectSSE();
    // startSyncProcessor();
    // if (isOnline) flushMutations();
  } else if (msg.type === 'MUTATE') {
    await queueMutation(msg.mutation);
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

  const { get, set } = await import('idb-keyval');

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

      const lastVersionStr = (await get<string>('sync_version')) || '0';
      latestVersion = parseInt(lastVersionStr, 10);

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
        const entitiesToSave: Entity[] = [];
        const updates: Update[] = [];

        for (const change of data.changes) {
          if (change.op === 'upsert') {
            const entity = {
              namespace: change.namespace,
              type: change.entityType,
              id: change.entityId,
              data: change.data,
              updatedAt: Date.now(),
              updatedBy: change.clientId,
            };
            entitiesToSave.push(entity);
            updates.push({
              op: 'upsert',
              type: change.entityType,
              id: change.entityId,
              data: change.data,
            });
          } else if (change.op === 'delete') {
            await removeEntityFromCache(change.entityType, change.entityId);
            updates.push({
              op: 'delete',
              type: change.entityType,
              id: change.entityId,
            });
          }
        }

        if (entitiesToSave.length > 0) {
          await saveEntities(entitiesToSave);
        }

        await set('sync_version', data.version.toString());
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

  const pending = await getPendingMutations();
  if (pending.length === 0) return;

  try {
    const payload = {
      clientId: CLIENT_ID,
      mutations: pending.map((p) => ({
        op: p.op,
        type: p.type,
        id: p.entityId,
        data: p.data,
        baseUpdatedAt: p.baseUpdatedAt,
      })),
    };

    const res = await fetch(`${API_BASE}/api/mutate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const ids = pending.map((p) => p.id!);
      await clearPendingMutations(ids);
    } else {
      console.warn('Worker: Mutate failed', res.status);
    }
  } catch (e) {
    console.error('Worker: Flush failed', e);
  }
};
