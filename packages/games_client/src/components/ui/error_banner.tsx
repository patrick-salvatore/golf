import { type Component, Show } from 'solid-js';
import { apiError, setApiError } from '~/state/ui';
import { AlertTriangle, X } from './icons';
import { cn } from '~/lib/cn';

const getErrorMessage = (status: number) => {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized - Please sign in again';
    case 403:
      return "Forbidden - You don't have permission to access this";
    case 404:
      return 'Not Found';
    case 500:
      return 'Internal Server Error';
    default:
      return 'An unexpected error occurred';
  }
};

const ErrorBanner: Component = () => {
  const error = apiError;

  return (
    <Show when={error()}>
      <div
        class={cn(
          'fixed top-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-top-full duration-300 shadow-md',
          'bg-destructive text-destructive-foreground',
          'flex items-center justify-between gap-4 safe-area-inset-top',
        )}
      >
        <div class="flex items-center gap-3 container mx-auto">
          <AlertTriangle class="h-5 w-5 shrink-0" />
          <div class="flex flex-col">
            <span class="font-semibold text-sm">Error {error()?.status}</span>
            <span class="text-sm">{getErrorMessage(error()?.status || 0)}</span>
          </div>
        </div>
        <button
          onClick={() => setApiError(null)}
          class="p-1 hover:bg-black/10 rounded-full transition-colors shrink-0"
          aria-label="Dismiss error"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </Show>
  );
};

export default ErrorBanner;
