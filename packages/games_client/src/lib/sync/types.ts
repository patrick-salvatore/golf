import type { Entity, MutationOp } from './db';

export type WorkerMessage =
  | { type: 'INIT'; token: string; clientId: string; apiUrl: string }
  | { type: 'MUTATE'; mutation: MutationOp };

export type MainMessage =
  | { type: 'SNAPSHOT'; entities: Entity[] }
  | {
      type: 'UPDATE';
      ops: { op: 'upsert' | 'delete'; type: string; id: number; data?: any }[];
    }
  | { type: 'STATUS'; status: 'idle' | 'syncing' | 'error'; online: boolean };

export type Update = {
  op: 'upsert' | 'delete';
  type: string;
  id: number;
  data?: any;
};
