import {
  createEffect,
  type ParentComponent,
  createSignal,
  Show,
} from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';

import { useTeamStore } from '~/state/team';
import { useSessionStore } from './session';
import { identity } from './helpers';
import { initStore } from './store';
import { syncSession, syncActiveContext } from './sync';
import { initSync } from '~/lib/sync/engine';

const ROUTES = ['start', 'leaderboard', 'scorecard', 'wagers'];

const AppStoreSetter: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);

  const session = useSessionStore(identity);
  const { store: teamStore } = useTeamStore();

  createEffect(() => {
    (async function _() {
      try {
        const currentIdentity = await syncSession();
        console.log(currentIdentity);
        setLoading(false);

        if (!session()?.teamId || !session()?.tournamentId) {
          return;
        }

        await initStore();
        await initSync();
        await syncActiveContext();

        const team = teamStore();

        if (!team.started) {
          navigate(`/tournament/start`);
        }

        const [, page] = location.pathname.split('/').filter(Boolean);
        if (!ROUTES.find((r) => r === page)) {
          navigate(`/tournament/scorecard`);
        } else if (team.started) {
          navigate(`/tournament/${page}`);
        }
      } catch (e) {
        console.error('Initialization error', e);
        navigate(`/tournament/assign`);
      }
    })();
  });

  return (
    <Show when={!loading()} fallback={<div>Loading...</div>}>
      {props.children}
    </Show>
  );
};

export default AppStoreSetter;
