/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { ErrorBoundary, lazy, onMount, Suspense } from 'solid-js';

import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import {
  createAsync,
  Route,
  Router,
  useNavigate,
  useBeforeLeave,
} from '@solidjs/router';

import { authCheck, adminAuthCheck, authTokenCheck } from '~/lib/auth';

import TournamentStoreSetter from '~/state';

import AppShell from '~/components/shell';
import { cancelRoutes } from './api/client';
import { setApiError } from './state/ui';

const JoinRoute = lazy(() => import('./pages/join'));
// const StartTournament = lazy(() => import('./pages/start_tournament'));
const LeaderboardRoute = lazy(() => import('./pages/leaderboard'));
const ScoreCardRoute = lazy(() => import('./pages/scorecard'));
const Admin = lazy(() => import('./pages/admin'));

const root = document.getElementById('root');

// @ts-ignore
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

const queryClient = new QueryClient();

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        fallback={(error, reset) => {
          console.error(error);
          return (
            <div>
              <p>Something went wrong: {error.message}</p>
              <button onClick={reset}>Try Again</button>
            </div>
          );
        }}
      >
        <Suspense>
          <Router
            root={(props) => {
              useBeforeLeave(() => {
                cancelRoutes();
                setApiError(null);
              });
              return <AppShell>{props.children}</AppShell>;
            }}
          >
            <Route
              path="/tournament"
              preload={() => createAsync(async () => authCheck())}
              component={TournamentStoreSetter}
            >
              <ScoreCardRoute />
              <LeaderboardRoute />
              <Route path="*" component={() => <div>Tournament page</div>} />
            </Route>
            <Route
              path="/join"
              component={JoinRoute}
              preload={() => createAsync(async () => authTokenCheck())}
            />
            <Route
              path="/_admin"
              preload={() => createAsync(async () => adminAuthCheck())}
              component={Admin}
            />
            <Route
              path="*"
              component={() => {
                const navigate = useNavigate();
                onMount(() => {
                  navigate('/join', { replace: true });
                });
                return <></>;
              }}
            />
          </Router>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  ),
  root!,
);
