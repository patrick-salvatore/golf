import { type ParentComponent, Show } from 'solid-js';

import { identity } from '~/state/helpers';
import { useTournamentStore } from '~/state/tournament';
import { useSessionStore } from '~/state/session';

import authStore from '~/lib/auth';
import { pwaStore } from '~/lib/pwa';

import { leaveSession } from '~/api/auth';

import InstallPrompt from './pwa/install_prompt';
import ErrorBanner from './ui/error_banner';
import GolfLoader from './ui/golf_loader';
import { Download, LogOut } from './ui/icons';

const AppShell: ParentComponent = (props) => {
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
    <>
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
      <ErrorBanner />
      <GolfLoader />
      <main class="flex-1 container mx-auto p-3">{props.children}</main>
      <InstallPrompt />
    </>
  );
};

export default AppShell;
