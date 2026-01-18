import { createStore, produce } from 'solid-js/store';
import { createMemo } from 'solid-js';
import type { Entity } from '~/lib/sync/db';

// Store structure:
// entities: { [type: string]: { [id: string]: any } }
type EntityStore = {
  [type: string]: {
    [id: string]: any;
  };
};

export const [entityStore, setEntityStore] = createStore<EntityStore>({});

export const updateEntity = (type: string, id: string, data: any) => {
  setEntityStore(
    produce((state) => {
      if (!state[type]) state[type] = {};
      state[type][id] = data;
    }),
  );
};

export const deleteEntity = (type: string, id: string) => {
  setEntityStore(
    produce((state) => {
      if (state[type]) {
        const typeState = state[type];
        delete typeState[id];
      }
    }),
  );
};

export const loadEntities = (entities: Entity[]) => {
  setEntityStore(
    produce((state) => {
      entities.forEach((e) => {
        if (!state[e.type]) state[e.type] = {};
        state[e.type][e.id] = e.data;
      });
    }),
  );
};

// Selectors (Hooks)
export const useEntity = <T = any>(type: string, id: string) => {
  return () => entityStore[type]?.[id] as T | undefined;
};

export const useEntities = <T = any>(type: string) => {
  return () => Object.values(entityStore[type] || {}) as T[];
};

export const useEntitySelector = <T, R>(
  type: string,
  selector: (entities: T[]) => R,
) => {
  const entities = useEntities<T>(type);
  return createMemo(() => selector(entities()));
};
