import client from './client';

export interface LeaderboardEntry {
  position: number;
  teamId: number;
  name: string;
  score: number;
  thru: number;
}

export interface LeaderboardResponse {
  tournamentId: number;
  format: string;
  leaderboard: LeaderboardEntry[];
}

export async function fetchLeaderboard(tournamentId: number) {
  return client
    .get<LeaderboardResponse>(`/v1/tournament/${tournamentId}/leaderboard`)
    .then((res) => res.data);
}
