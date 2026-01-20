import { createMemo, type Accessor } from 'solid-js';

import { useEntities } from './entities';
import type { TournamentState } from './schema';
import { useSessionStore } from './session';

type State = TournamentState;

export function useTournamentStore(): { store: Accessor<State> };
export function useTournamentStore<T>(selector: (s: State) => T): () => T;
export function useTournamentStore<T>(selector?: (s: State) => T) {
  const session = useSessionStore((s) => s?.tournamentId);
  const allTournaments = useEntities<TournamentState>('tournament');

  const store = createMemo(() => {
    const tid = session();
    if (!tid)
      return {
        id: 0,
        name: '',
        courseId: 0,
        formatId: 0,
        teamCount: 0,
        awardedHandicap: 0,
        isMatchPlay: false,
        complete: false,
        created: '',
      } as State;


    const t = allTournaments().find((t) => t.id === tid);

    return (
      t ||
      ({
        id: 0,
        name: '',
        courseId: 0,
        formatId: 0,
        teamCount: 0,
        awardedHandicap: 0,
        isMatchPlay: false,
        complete: false,
        created: '',
      } as State)
    );
  });

  if (selector) {
    return () => selector(store());
  }

  return { store };
}
