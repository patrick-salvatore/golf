import { createSignal } from 'solid-js';
import { loadEntities, updateEntity, deleteEntity } from '~/state/entities';
import type { WorkerMessage, MainMessage } from './types';

import SyncWorker from './worker?worker'; // Vite worker import
import authStore from '../auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const [isOnline, setIsOnline] = createSignal(navigator.onLine);
export const [syncStatus, setSyncStatus] = createSignal<
  'idle' | 'syncing' | 'error'
>('idle');

let worker: Worker | null = null;

const getClientId = () => {
  let id = localStorage.getItem('sync_client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sync_client_id', id);
  }
  return id;
};

export const initSync = async () => {
  if (worker) return;

  worker = new SyncWorker();

  worker.onmessage = (event: MessageEvent<MainMessage>) => {
    const msg = event.data;

    switch (msg.type) {
      case 'SNAPSHOT':
        loadEntities(msg.entities);
        break;
      case 'UPDATE':
        // Apply batch updates to store
        // We could optimize this to be a batch operation in the store
        msg.ops.forEach((op) => {
          if (op.op === 'upsert') updateEntity(op.type, op.id, op.data);
          else deleteEntity(op.type, op.id);
        });
        break;
      case 'STATUS':
        setSyncStatus(msg.status);
        setIsOnline(msg.online);
        break;
    }
  };

  worker.postMessage({
    type: 'INIT',
    apiUrl: API_BASE,
    token: authStore.token,
    clientId: getClientId(),
  } as WorkerMessage);
};

export const mutate = async (
  type: string,
  id: number,
  data: any,
  op: 'upsert' | 'delete' = 'upsert',
) => {
  // 1. Optimistic Update (Main Thread)
  if (op === 'upsert') {
    updateEntity(type, id, data);
  } else {
    deleteEntity(type, id);
  }

  // 2. Send to Worker
  if (worker) {
    worker.postMessage({
      type: 'MUTATE',
      mutation: {
        op,
        type,
        entityId: id,
        data,
        baseUpdatedAt: Date.now(), // Approximation, worker handles real persistence
      },
    } as WorkerMessage);
  }
};
