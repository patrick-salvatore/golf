/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { ErrorBoundary, lazy, onMount, Suspense } from 'solid-js';

import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { Route, Router, useNavigate, useBeforeLeave } from '@solidjs/router';

import TournamentStoreSetter from '~/state';

import AppShell from '~/components/shell';
import { cancelRoutes } from './api/client';
import { setApiError } from './state/ui';
import { ErrorFallback } from './components/error_fallback';
import { AuthProvider } from './components/auth_provider';

const JoinRoute = lazy(() => import('./pages/join'));
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
        fallback={(error, reset) => (
          <ErrorFallback error={error} reset={reset} />
        )}
      >
        <Suspense>
          <Router
            root={(props) => {
              useBeforeLeave(() => {
                cancelRoutes();
                setApiError(null);
              });
              return (
                <AuthProvider>
                  <AppShell>{props.children}</AppShell>
                </AuthProvider>
              );
            }}
          >
            <Route path="/tournament" component={TournamentStoreSetter}>
              <ScoreCardRoute />
              <LeaderboardRoute />
              <Route path="/" component={() => {
                const navigate = useNavigate();
                onMount(() => {
                  navigate('/tournament/scorecard', { replace: true });
                });
                return <></>;
              }} />
            </Route>
            <Route path="/join" component={JoinRoute} />
            <Route path="/_admin" component={Admin} />
          </Router>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  ),
  root!,
);
