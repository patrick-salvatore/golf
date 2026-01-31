import { createMemo, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { useSessionStore } from '~/state/session';
import { identity } from '~/state/helpers';
import { fetchLeaderboard, fetchRoundLeaderboard } from '~/api/leaderboard';
import { useTournamentRounds } from '~/state/tournament_rounds';

const Leaderboard = () => {
  const session = useSessionStore(identity);
  const rounds = useTournamentRounds();

  const query = useQuery(() => ({
    queryKey: ['leaderboard', session()?.tournamentId, session()?.roundId],
    queryFn: () => {
      const tournamentId = session()?.tournamentId;
      const roundId = session()?.roundId;
      
      if (tournamentId && roundId && rounds.isMultiRound()) {
        // Use round-specific leaderboard for multi-round tournaments
        return fetchRoundLeaderboard(tournamentId, roundId);
      } else if (tournamentId) {
        // Use tournament-wide leaderboard for single-round or overall view
        return fetchLeaderboard(tournamentId);
      }
      return null;
    },
    enabled: !!session()?.tournamentId,
    refetchInterval: 10000,
  }));

  const rows = createMemo(() => query.data?.leaderboard || []);
  const format = createMemo(() => query.data?.format || '');

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
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {format()}
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-50 text-gray-500 font-medium border-b">
            <tr>
              <th class="px-4 py-2 w-12 text-center">Pos</th>
              <th class="px-4 py-2">Team</th>
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
            <For each={rows()}>
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
                    {entry.thru === 18 ? 'F' : entry.thru}
                  </td>
                </tr>
              )}
            </For>
            <Show when={!query.isLoading && rows().length === 0}>
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                  No scores yet
                </td>
              </tr>
            </Show>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
