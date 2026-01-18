import type { Leaderboard } from "~/lib/leaderboard";
import client from "./client";
import type { Hole } from "~/lib/hole";

export async function getLeaderboard({
  tournamentId,
  individuals = false,
}: {
  tournamentId: string;
  individuals?: boolean;
}) {
  return client
    .get<Leaderboard>(
      `/v1/tournament/${tournamentId}/leaderboard?individuals=${individuals}`
    )
    .then((res) => res.data);
}
