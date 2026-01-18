import { type Component, Show } from 'solid-js';
import { pwaStore } from '~/lib/pwa';
import { Download, PlusSquare, Share, X } from '../ui/icons';

const InstallPrompt: Component = () => {
  const { showPrompt, isIOS, install, closePrompt } = pwaStore;

  return (
    <Show when={showPrompt()}>
      <div class="fixed inset-x-0 bottom-0 z-50 p-4 pb-8 pointer-events-none flex justify-center">
        <div class="bg-white border border-gray-200 shadow-xl rounded-2xl p-4 w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-bold text-lg text-gray-900">Install App</h3>
              <p class="text-sm text-gray-600 mt-1">
                Install this app on your home screen for quick and easy access.
              </p>
            </div>
            <button
              onClick={closePrompt}
              class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <Show
            when={isIOS()}
            fallback={
              <button
                onClick={install}
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download class="w-5 h-5" />
                Install App
              </button>
            }
          >
            <div class="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 space-y-2 border border-gray-100">
              <div class="flex items-center gap-2">
                <span class="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-bold text-gray-600">
                  1
                </span>
                <span>
                  Tap the <Share class="w-4 h-4 inline mx-1 text-blue-500" />{' '}
                  <strong>Share</strong> button below.
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-bold text-gray-600">
                  2
                </span>
                <span>
                  Select{' '}
                  <PlusSquare class="w-4 h-4 inline mx-1 text-gray-600" />{' '}
                  <strong>Add to Home Screen</strong>.
                </span>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default InstallPrompt;
