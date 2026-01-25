import type { Leaderboard } from '~/lib/leaderboard';
import client from './client';

export async function fetchLeaderboard({
  tournamentId,
  individuals = false,
}: {
  tournamentId: number;
  individuals?: boolean;
}) {
  return client
    .get<Leaderboard>(
      `/v1/tournament/${tournamentId}/leaderboard?individuals=${individuals}`,
    )
    .then((res) => res.data);
}
