import Download from 'lucide-solid/icons/download';
import LogOut from 'lucide-solid/icons/log-out';
import { Show } from 'solid-js';
import { leaveSession } from '~/api/auth';
import authStore from '~/lib/auth';
import { pwaStore } from '~/lib/pwa';
import { useEntity } from '~/state/entities';

export const Header = () => {
  const session = useEntity('session', 'current');
  const tournament = useEntity('tournament', 'current');

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
    <header class="bg-golf-surface border-b border-white/5 top-0 pt-safe transition-all duration-200">
      <div class="container mx-auto px-2 py-2 flex items-center justify-between">
        <h1 class="text-xl font-semibold capitalize">{tournament()?.name}</h1>
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
