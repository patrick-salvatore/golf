import Download from 'lucide-solid/icons/download';
import LogOut from 'lucide-solid/icons/log-out';
import { Show } from 'solid-js';
import { leaveSession } from '~/api/auth';
import authStore from '~/lib/auth';
import { pwaStore } from '~/lib/pwa';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';
import { useTournamentStore } from '~/state/tournament';

export const Header = () => {
  const tournamentName = useTournamentStore(identity);
  const session = useSessionStore(identity);

  const { isStandalone, openPrompt } = pwaStore;

  const handleLeave = async () => {
    try {
      await leaveSession();
    } catch (e) {
      console.error('Failed to release session', e);
    } finally {
      authStore.clear();
      window.location.replace('/join');
    }
  };

  return (
    <header class="bg-golf-surface border-b border-white/5 sticky top-0 z-50 pt-safe transition-all duration-200">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold capitalize">
          {tournamentName().name}
        </h1>
        <div class="flex items-center gap-2">
          <Show when={!isStandalone()}>
            <button
              onClick={openPrompt}
              class="text-gray-400 hover:text-white transition-colors p-1"
              title="Install App"
            >
              <Download class="w-5 h-5" />
            </button>
          </Show>
          <Show when={session()}>
            <button
              onClick={handleLeave}
              class="text-gray-400 hover:text-white transition-colors p-1"
              title="Leave Session"
            >
              <LogOut class="w-5 h-5" />
            </button>
          </Show>
        </div>
      </div>
    </header>
  );
};
