import {
  createEffect,
  type ParentComponent,
  createSignal,
  Show,
  onCleanup,
  onMount,
} from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';

import GolfLoader from '~/components/ui/golf_loader';
import ErrorBanner from '~/components/ui/error_banner';

import { identity } from './helpers';
import { syncActiveContext } from './sync';
import { useEntity, useEntityById } from './entities';
import { setIsLandscape } from './ui';

const ROUTES = ['start', 'leaderboard', 'scorecard', 'wagers'];

const TournamentStoreSetter: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useEntity('session', 'current');
  const getTeamById = useEntityById('team');

  const [loading, setLoading] = createSignal(true);

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

        await syncActiveContext(s);
        const team = getTeamById(session().teamId);
        if (!team) {
          return;
        }

        setLoading(false);

        const [, page] = location.pathname.split('/').filter(Boolean);
        if (!ROUTES.find((r) => r === page)) {
          navigate(`/tournament/scorecard`);
        }
      } catch (e) {
        console.error('Initialization error', e);
      }
    })();
  });

  return (
    <>
      <Show when={!loading()} fallback={<GolfLoader />}>
        {props.children}
      </Show>
      <ErrorBanner />
    </>
  );
};

export default TournamentStoreSetter;
