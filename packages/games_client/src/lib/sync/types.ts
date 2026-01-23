import type { EntityTypes } from '~/state/entities';
import type { Entity, MutationOp } from './db';

export type WorkerMessage =
  | { type: 'INIT'; jid: string; rid: string; clientId: string; apiUrl: string }
  | { type: 'MUTATE'; mutation: MutationOp };

export type MainMessage =
  | {
      type: 'UPDATE';
      ops: { op: 'upsert' | 'delete'; type: keyof EntityTypes; id: number; data?: any }[];
    }
  | { type: 'SNAPSHOT'; entities: Entity[] }
  | { type: 'STATUS'; status: 'idle' | 'syncing' | 'error'; online: boolean }

export type Update = {
  op: 'upsert' | 'delete';
  type: string;
  id: number;
  data?: any;
};
