import client from './client';

export interface LeaderboardEntry {
  position: number;
  teamId: number;
  name: string;
  score: number;
  thru: number;
}

export interface GroupLeaderboardEntry {
  position: number;
  groupId: number;
  name: string;
  score: number;
  thru: number;
}

export interface LeaderboardResponse {
  tournamentId: number;
  format: string;
  leaderboard: LeaderboardEntry[];
  teams: LeaderboardEntry[];
  groups: GroupLeaderboardEntry[];
}

export async function fetchLeaderboard(tournamentId: number) {
  return client
    .get<LeaderboardResponse>(`/v1/tournament/${tournamentId}/leaderboard`)
    .then((res) => res.data);
}

export async function fetchRoundLeaderboard(tournamentId: number, roundId: number) {
  return client
    .get<LeaderboardResponse>(`/v1/tournament/${tournamentId}/round/${roundId}/leaderboard`)
    .then((res) => res.data);
}
