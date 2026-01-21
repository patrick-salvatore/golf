import {
  createEffect,
  type ParentComponent,
  createSignal,
  Show,
} from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';

import { initSync } from '~/lib/sync/engine';

import { useSessionStore } from './session';
import { identity } from './helpers';
import { syncActiveContext } from './sync';
import { useEntityById } from './entities';
import { getActivePlayers } from '~/api/player';
import authStore from '~/lib/auth';
import GolfLoader from '~/components/ui/golf_loader';

const ROUTES = ['start', 'leaderboard', 'scorecard', 'wagers'];

const TournamentStoreSetter: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);

  const session = useSessionStore(identity);
  const getTeamById = useEntityById('team');

  createEffect(() => {
    (async function _() {
      try {
        const s = session();
        if (!s?.teamId || !s?.tournamentId) {
          return;
        }

        const isActivePlayer = await getActivePlayers(
          s.tournamentId,
          s.playerId,
        );

        if (!isActivePlayer) {
          authStore.clear();
          navigate('/join');
          return;
        }

        await initSync();
        // await syncActiveContext(s);

        const team = getTeamById(session().teamId);

        if (!team) {
          return;
        }

        if (!team.started) {
          navigate(`/tournament/start`);
          return;
        }

        setLoading(false);

        const [, page] = location.pathname.split('/').filter(Boolean);
        if (!ROUTES.find((r) => r === page)) {
          navigate(`/tournament/scorecard`);
        } else if (team.started) {
          navigate(`/tournament/${page}`);
        }
      } catch (e) {
        console.error('Initialization error', e);
      }
    })();
  });

  return (
    <Show when={!loading()} fallback={<GolfLoader />}>
      {props.children}
    </Show>
  );
};

export default TournamentStoreSetter;
