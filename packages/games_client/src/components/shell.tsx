import { useNavigate } from '@solidjs/router';
import { type ParentComponent, Show } from 'solid-js';

import { identity } from '~/state/helpers';
import { useTournamentStore } from '~/state/tournament';
import authStore from '~/lib/auth';
import client from '~/api/client';
import { pwaStore } from '~/lib/pwa';

import InstallPrompt from './pwa/install_prompt';
import { Download, LogOut } from './ui/icons';

const AppShell: ParentComponent = (props) => {
  const tournamentName = useTournamentStore(identity);
  const navigate = useNavigate();
  const { isStandalone, openPrompt } = pwaStore;

  const handleLeave = async () => {
    try {
      await client.post('/v1/session/leave');
    } catch (e) {
      console.error('Failed to release session', e);
    } finally {
      authStore.clear();
      navigate('/join'); // Or home
    }
  };

  return (
    <>
      <header class="bg-golf-surface border-b border-white/5 sticky top-0 z-50">
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
            <button
              onClick={handleLeave}
              class="text-gray-400 hover:text-white transition-colors p-1"
              title="Leave Session"
            >
              <LogOut class="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main class="flex-1 container mx-auto p-3">{props.children}</main>
      <InstallPrompt />
    </>
  );
};

export default AppShell;
