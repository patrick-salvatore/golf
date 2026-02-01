import { createMemo, createSignal, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';

import { fetchLeaderboard, type LeaderboardEntry } from '~/api/leaderboard';

import { useEntity } from '~/state/entities';
import { Bottomsheet } from '../bottom_sheet';
import { ScorecardReadOnly } from '../score/scorecard_read_only';

const Leaderboard = () => {
  const session = useEntity('session', 'current');
  const [selectedTeam, setSelectedTeam] = createSignal<LeaderboardEntry | null>(
    null,
  );
  const [viewMode, setViewMode] = createSignal<'teams' | 'groups'>('teams');

  const query = useQuery(() => ({
    queryKey: ['leaderboard', session()?.tournamentId, session()?.roundId],
    queryFn: () => {
      const tournamentId = session()?.tournamentId;
      return fetchLeaderboard(tournamentId);
    },
    enabled: !!session()?.tournamentId,
    refetchInterval: 10000,
  }));

  // Fallback to "leaderboard" (legacy) if "teams" is missing, or empty array
  const teamRows = createMemo(
    () => query.data?.teams || query.data?.leaderboard || [],
  );
  const groupRows = createMemo(() => query.data?.groups || []);
  const format = createMemo(() => query.data?.format || '');

  const hasGroups = createMemo(() => groupRows().length > 0);

  const formatScore = (score: number) => {
    if (score === 0) return 'E';
    if (score > 0)
      return <span class="flex items-center gap-1 text-red-600">+{score}</span>;
    return <span class="flex items-center gap-1 text-green-600">{score}</span>;
  };

  return (
    <div class="w-full bg-white rounded-lg shadow-sm overflow-hidden border">
      <div class="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
        <h2 class="font-bold text-gray-700">Leaderboard</h2>
        <div class="flex items-center gap-2">
          <Show when={hasGroups()}>
            <div class="flex bg-gray-200 rounded-lg p-1 text-xs font-medium">
              <button
                class={`px-3 py-1 rounded-md transition-colors ${
                  viewMode() === 'teams'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setViewMode('teams')}
              >
                Teams
              </button>
              <button
                class={`px-3 py-1 rounded-md transition-colors ${
                  viewMode() === 'groups'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setViewMode('groups')}
              >
                Groups
              </button>
            </div>
          </Show>
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {format()}
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-50 text-gray-500 font-medium border-b">
            <tr>
              <th class="px-4 py-2 w-12 text-center">Pos</th>
              <th class="px-4 py-2">
                {viewMode() === 'teams' ? 'Team' : 'Group'}
              </th>
              <th class="px-4 py-2 w-20 text-center">Score</th>
              <th class="px-4 py-2 w-16 text-center">Thru</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <Show when={query.isLoading}>
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            </Show>

            <Show when={viewMode() === 'teams'}>
              <For each={teamRows()}>
                {(entry) => (
                  <tr
                    class="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTeam(entry)}
                  >
                    <td class="px-4 py-3 text-center font-bold text-gray-600">
                      {entry.position}
                    </td>
                    <td class="px-4 py-3 font-medium text-gray-900">
                      {entry.name}
                    </td>
                    <td class="px-4 py-3 text-center font-bold">
                      <div class="flex justify-center">
                        {formatScore(entry.score)}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-500">
                      {entry.thru === 18 ? 'F' : entry.thru}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={!query.isLoading && teamRows().length === 0}>
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                    No scores yet
                  </td>
                </tr>
              </Show>
            </Show>

            <Show when={viewMode() === 'groups'}>
              <For each={groupRows()}>
                {(entry) => (
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-center font-bold text-gray-600">
                      {entry.position}
                    </td>
                    <td class="px-4 py-3 font-medium text-gray-900">
                      {entry.name}
                    </td>
                    <td class="px-4 py-3 text-center font-bold">
                      <div class="flex justify-center">
                        {formatScore(entry.score)}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-500">
                      {entry.thru}
                    </td>
                  </tr>
                )}
              </For>
            </Show>
          </tbody>
        </table>
      </div>

      <Show when={selectedTeam()}>
        <Bottomsheet
          variant="default"
          onClose={() => setSelectedTeam(null)}
          maxHeight={window.innerHeight * 0.85}
        >
          <div class="h-full flex flex-col">
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 class="font-bold text-lg">{selectedTeam()?.name}</h3>
                <div class="text-sm text-gray-500 flex gap-2">
                  <span>Pos: {selectedTeam()?.position}</span>
                  <span class="flex gap-1">
                    Score: {formatScore(selectedTeam()?.score || 0)}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <Show
                when={session()?.roundId}
                fallback={<div>No round selected</div>}
              >
                <ScorecardReadOnly
                  teamId={selectedTeam()!.teamId}
                  roundId={session()!.roundId}
                  teamName={selectedTeam()!.name}
                />
              </Show>
            </div>
          </div>
        </Bottomsheet>
      </Show>
    </div>
  );
};

export default Leaderboard;
