import { createMemo, type Accessor } from 'solid-js';

import { reduceToByIdMap } from '~/lib/utils';

import { useEntities } from './entities';
import type { TeamState, PlayerState } from './schema';
import { useSessionStore } from './session';

export type TeamWithPlayers = TeamState & {
  players: PlayerState[];
};

type State = TeamWithPlayers;

export function useTeamStore(): { store: Accessor<State> };
export function useTeamStore<T>(selector: (s: State) => T): () => T;
export function useTeamStore<T>(selector?: (s: State) => T) {
  const session = useSessionStore((s) => s?.teamId);

  // Reactive hooks
  const allTeams = useEntities<TeamState>('team');
  const allPlayers = useEntities<PlayerState>('player');

  const store = createMemo(() => {
    const teamId = session();
    if (!teamId)
      return {
        id: 0,
        name: '',
        tournamentId: 0,
        started: false,
        finished: false,
        players: [],
      } as State;

    const t = allTeams().find((t) => t.id === teamId);
    const p = allPlayers().filter((player) => player.teamId === teamId);

    if (!t)
      return {
        id: 0,
        name: '',
        tournamentId: 0,
        started: false,
        finished: false,
        players: [],
      } as State;

    return { ...t, players: p };
  });

  if (selector) {
    return () => selector(store());
  }

  return { store };
}

export function useTeamStoreSelector<T>(
  selector: (s: TeamWithPlayers) => T,
): () => T {
  const s = useTeamStore(selector);
  return s;
}

export const selectTeamPlayersMap = (state: TeamWithPlayers) =>
  reduceToByIdMap(state.players, 'id');
