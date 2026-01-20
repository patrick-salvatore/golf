import { get, set, setMany, del, delMany, entries } from 'idb-keyval';

export interface Entity {
  namespace: string;
  type: string;
  id: number;
  data: any;
  updatedAt: number;
  updatedBy: string;
}

export interface MutationOp {
  id?: string; // Changed to string for idb-keyval compatibility (using timestamps)
  op: 'upsert' | 'delete';
  type: string;
  entityId: number;
  data: any;
  baseUpdatedAt?: number;
}

// Key Helpers
const entityKey = (type: string, id: string | number) => `e:${type}:${id}`;
const mutationKey = (id: string) => `m:${id}`;

const isEntityKey = (key: IDBValidKey) =>
  typeof key === 'string' && key.startsWith('e:');
const isMutationKey = (key: IDBValidKey) =>
  typeof key === 'string' && key.startsWith('m:');

export const saveEntities = async (entities: Entity[]) => {
  const entries: [IDBValidKey, any][] = entities.map((e) => [
    entityKey(e.type, e.id),
    e,
  ]);
  await setMany(entries);
};

export const getEntities = async (): Promise<Entity[]> => {
  const allEntries = await entries();
  return allEntries
    .filter(([key]) => isEntityKey(key))
    .map(([, value]) => value as Entity);
};

export const removeEntityFromCache = async (type: string, id: string) => {
  await del(entityKey(type, id));
};

export const queueMutation = async (mutation: MutationOp) => {
  // Generate a sortable ID based on timestamp
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  mutation.id = id;
  await set(mutationKey(id), mutation);
};

export const getPendingMutations = async (): Promise<MutationOp[]> => {
  const allEntries = await entries();
  return allEntries
    .filter(([key]) => isMutationKey(key))
    .sort(([keyA], [keyB]) => (keyA as string).localeCompare(keyB as string)) // Ensure FIFO
    .map(([, value]) => value as MutationOp);
};

export const removeMutation = async (id: string) => {
  await del(mutationKey(id));
};

export const clearPendingMutations = async (ids: string[]) => {
  await delMany(ids.map((id) => mutationKey(id)));
};
