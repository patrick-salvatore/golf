import { createStore, produce } from 'solid-js/store';
import { createMemo } from 'solid-js';

import type { Entity } from '~/lib/sync/db';
import type {
  CourseState,
  InviteState,
  PlayerState,
  ScoreState,
  TeamState,
  TournamentFormatState,
  TournamentState,
  SessionState,
} from './schema';

export type EntityTypes = {
  course: CourseState;
  invite: InviteState;
  player: PlayerState;
  score: ScoreState;
  team: TeamState;
  tournament: TournamentState;
  tournament_format: TournamentFormatState;
  session: SessionState;
};

type EntityStore = {
  [type: string]: {
    [id: string]: any;
  };
};

export const [entityStore, setEntityStore] = createStore<EntityStore>({});

export const updateEntity = (type: string, id: number | string, data: any) => {
  setEntityStore(
    produce((state) => {
      if (!state[type]) state[type] = {};
      state[type][id] = data;
    }),
  );
};

export const deleteEntity = (type: string, id: number | string) => {
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
export const useEntity = <K extends keyof EntityTypes>(type: K, id: string) => {
  return () => entityStore[type]?.[id] as EntityTypes[K] | undefined;
};

export const useEntityById = <K extends keyof EntityTypes>(type: K) => {
  return (id: number | string) =>
    entityStore[type]?.[id] as EntityTypes[K] | undefined;
};

export const useEntities = <T = any>(type: string) => {
  return () => Object.values(entityStore[type] || {}) as T[];
};
