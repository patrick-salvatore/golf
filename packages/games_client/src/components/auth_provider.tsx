import {
  createContext,
  useContext,
  createSignal,
  onMount,
  type ParentComponent,
  Show,
  createEffect,
} from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import authStore, { authenticate, type AuthSession } from '~/lib/auth';
import { fetchActivePlayers } from '~/api/player';
import { getSession } from '~/api/auth';
import { updateEntity } from '~/state/entities';

interface AuthContextValue {
  session: () => AuthSession | null;
  loading: () => boolean;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isPlayer: () => boolean;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
  const [session, setSession] = createSignal<AuthSession | null>(null);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = async () => {
    try {
      if (!authStore.token && !authStore.refreshToken) {
        setSession(null);
        setLoading(false);
        return;
      }

      const sess = await authenticate();

      if (sess) {
        // If user is a player, verify they are still active in the tournament
        if (sess.playerId && sess.playerId > 0 && sess.tournamentId) {
          try {
            const activePlayers = await fetchActivePlayers(
              sess.tournamentId,
              sess.playerId,
            );

            if (!activePlayers) {
              authStore.clear();
              setSession(null);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to validate active player', e);
            authStore.clear();
            setSession(null);
            setLoading(false);
            return;
          }
        }
        setSession(sess);
        updateEntity('session', 'current', session);
      } else {
        authStore.clear();
        setSession(null);
        updateEntity('session', 'current', null);
      }
    } catch (e) {
      console.error('Auth check failed', e);
      setSession(null);
      updateEntity('session', 'current', null);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    checkAuth();

    // Subscribe to storage changes
    authStore.onChange(() => {
      checkAuth();
    });
  });

  // Protection Logic - simplified to prevent redirect loops
  createEffect(() => {
    if (loading()) return;

    const s = session();
    const currentPath = location.pathname;

    // Case 1: Authenticated player on /join -> redirect to tournament
    if (currentPath === '/join' && s?.playerId && s.playerId > 0) {
      navigate('/tournament', { replace: true });
      return;
    }

    // Case 2: On tournament routes but not authenticated -> redirect to /join
    if (
      currentPath.startsWith('/tournament') &&
      (!s || !s.playerId || s.playerId <= 0)
    ) {
      navigate('/join', { replace: true });
      return;
    }

    // Case 3: On any other route that's not /join, /tournament, or /_admin -> redirect to /join
    if (
      currentPath !== '/join' &&
      !currentPath.startsWith('/tournament') &&
      !currentPath.startsWith('/_admin')
    ) {
      navigate('/join', { replace: true });
    }
  });

  const value: AuthContextValue = {
    session,
    loading,
    isAuthenticated: () => !!session(),
    isAdmin: () => !!session()?.isAdmin,
    isPlayer: () => !!session()?.playerId && session()!.playerId! > 0,
  };

  return (
    <AuthContext.Provider value={value}>
      <Show
        when={!loading()}
        fallback={
          <div class="h-screen w-screen flex items-center justify-center">
            Loading...
          </div>
        }
      >
        {props.children}
      </Show>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
