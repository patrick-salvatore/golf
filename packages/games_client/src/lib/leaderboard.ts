export interface LeaderboardRow {
  id: string;
  teamName: string;
  thru: number;
  netScore: number;
  grossScore: number;
  coursePar: number;
}

export type Leaderboard = LeaderboardRow[];
