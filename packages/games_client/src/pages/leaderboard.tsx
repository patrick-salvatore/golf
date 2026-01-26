import { Show, Suspense } from 'solid-js';
import { Route } from '@solidjs/router';

import { identity } from '~/state/helpers';
import { useTournamentStore } from '~/state/tournament';

import TournamentView from '~/components/tournament_view';
import Leaderboard from '~/components/leaderboard/leaderboard';

export default () => {
  const tournament = useTournamentStore(identity);

  return (
    <Route
      path="/leaderboard"
      component={() => (
        <Show when={tournament().id}>
          <TournamentView>
            <Suspense>
              <Leaderboard />
            </Suspense>
          </TournamentView>
        </Show>
      )}
    />
  );
};
