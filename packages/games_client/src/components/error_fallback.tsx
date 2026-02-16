import { createSignal, Show } from 'solid-js';
import { AlertTriangle } from '~/components/ui/icons';
import { Button } from '~/components/ui/button';

interface ErrorFallbackProps {
  error: any;
  reset: () => void;
}

export const ErrorFallback = (props: ErrorFallbackProps) => {
  const [showDetails, setShowDetails] = createSignal(false);

  console.error(props.error)
  return (
    <div class="min-h-screen w-full bg-golf-dark flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-8 text-center space-y-6">
        <div class="flex justify-center">
          <div class="p-4 bg-red-500/10 rounded-full">
            <AlertTriangle class="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-white">Something went wrong</h1>
          <p class="text-slate-400">
            An unexpected error occurred. We've been notified and are working to fix it.
          </p>
        </div>

        <div class="flex flex-col gap-3 pt-4">
          <Button
            onClick={props.reset}
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={window.location.reload}
            class="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Go Home
          </Button>
        </div>

        <div class="pt-4 border-t border-slate-800">
           <button
            onClick={() => setShowDetails(!showDetails())}
            class="text-xs text-slate-500 hover:text-slate-400 underline"
          >
            {showDetails() ? 'Hide Error Details' : 'Show Error Details'}
          </button>
          
          <Show when={showDetails()}>
            <div class="mt-4 p-3 bg-black/50 rounded text-left overflow-auto max-h-40">
              <pre class="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
                {props.error?.message || JSON.stringify(props.error)}
                {'\n'}
                {props.error?.stack}
              </pre>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
