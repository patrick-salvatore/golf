import { Show, Suspense } from 'solid-js';
import { Route } from '@solidjs/router';

import TournamentView from '~/components/tournament_view';
import Leaderboard from '~/components/leaderboard/leaderboard';
import { useEntity } from '~/state/entities';

export default () => {
  const tournament = useEntity('tournament', 'current');

  return (
    <Route
      path="/leaderboard"
      component={() => (
        <Show when={tournament()?.id}>
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
