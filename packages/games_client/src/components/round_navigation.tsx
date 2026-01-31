import { For, Show, createEffect, createMemo } from 'solid-js';
import { useTournamentRounds } from '~/state/tournament_rounds';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/cn';
import { switchUserToRound } from '~/lib/round_detection';
import { authenticateSession } from '~/lib/auth';

const RoundNavigation = () => {
  const { rounds, activeRoundId, isMultiRound, activeRound } =
    useTournamentRounds();

  const variant = createMemo(() => (isMultiRound() ? 'tabs' : 'dropdown'));

  return (
    <Show when={isMultiRound()}>
      <div class="w-full">
        <Show
          when={variant() === 'tabs'}
          fallback={
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Round:</span>
              <select
                value={activeRoundId()?.toString() || ''}
                class="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <For each={rounds()}>
                  {(round) => (
                    <option value={round.id.toString()}>
                      {round.name} - {new Date(round.date).toLocaleDateString()}
                    </option>
                  )}
                </For>
              </select>
            </div>
          }
        >
          {/* Tab interface for desktop */}
          <div class="border-b border-gray-200 bg-white">
            <div class="px-4 py-2 flex items-center justify-between mb-3">
              <div>
                <span class="text-sm text-gray-500">
                  {new Date(activeRound()?.date || '').toLocaleDateString()} •{' '}
                  {activeRound()?.courseName || 'Course'}
                </span>
              </div>
              <div class="text-xs text-gray-400">
                <Show when={activeRound()?.status === 'active'}>
                  <span class="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                    In Progress
                  </span>
                </Show>
                <Show when={activeRound()?.status === 'pending'}>
                  <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Not Started
                  </span>
                </Show>
                <Show when={activeRound()?.status === 'completed'}>
                  <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    Complete
                  </span>
                </Show>
              </div>
            </div>

            {/* Round tabs */}
            <div class="overflow-x-auto">
              <div class="flex min-w-max mx-4 my-2">
                <For each={rounds()}>
                  {(round) => (
                    <Button
                      variant="ghost"
                      class={cn(
                        'h-full text-sm font-medium border-b-2 rounded-none transition-colors',
                        activeRoundId() === round.id
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                      )}
                    >
                      <div class="text-center">
                        <div class="font-medium">{round.name}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          {new Date(round.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </Button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default RoundNavigation;
