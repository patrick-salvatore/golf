import {
  createEffect,
  type ParentComponent,
  createSignal,
  Show,
  onCleanup,
  onMount,
} from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';

import { initSync } from '~/lib/sync/engine';
import { getActivePlayers } from '~/api/player';
import authStore from '~/lib/auth';

import GolfLoader from '~/components/ui/golf_loader';

import { useSessionStore } from './session';
import { identity } from './helpers';
import { syncActiveContext } from './sync';
import { useEntityById } from './entities';
import { setIsLandscape } from './ui';

const ROUTES = ['start', 'leaderboard', 'scorecard', 'wagers'];

const TournamentStoreSetter: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);

  const session = useSessionStore(identity);
  const getTeamById = useEntityById('team');

  onMount(() => {
    const media = window.matchMedia('(orientation: landscape)');
    setIsLandscape(media.matches);

    const listener = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    media.addEventListener('change', listener);
    onCleanup(() => media.removeEventListener('change', listener));
  });

  createEffect(() => {
    (async function _() {
      try {
        const s = session();
        if (!s?.teamId || !s?.tournamentId) {
          return;
        }

        // await initSync();
        await syncActiveContext(s);

        const team = getTeamById(session().teamId);

        if (!team) {
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
