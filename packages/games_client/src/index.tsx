/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { ErrorBoundary, onMount, Suspense } from 'solid-js';

import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { createAsync, Route, Router, useNavigate } from '@solidjs/router';

import { authCheck, adminAuthCheck } from '~/lib/auth';

import AppStoreSetter from '~/state';

import AppShell from '~/components/shell';

import TeamIdentity from './pages';
import StartRoute from './pages/start_tournament';
import LeaderboardRoute from './pages/leaderboard';
import ScoreCardRoute from './pages/scorecard';

import { Admin } from './pages/admin';
import JoinRoute from './pages/join'; // New Import

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
        fallback={(error, reset) => (
          <div>
            <p>Something went wrong: {error.message}</p>
            <button onClick={reset}>Try Again</button>
          </div>
        )}
      >
        <Suspense>
          <Router root={AppShell}>
            <Route
              path="/tournament"
              preload={() => createAsync(async () => authCheck())}
              component={AppStoreSetter}
            >
              <StartRoute />
              <ScoreCardRoute />
              <LeaderboardRoute />
              <Route path="*" component={TeamIdentity} />
            </Route>
            <Route path="/join" component={JoinRoute} />
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
                  navigate('/tournament', { replace: true });
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
