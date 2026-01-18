export type LeaderboardRow = {
  id: string;
  teamName: string;
  grossScore: number;
  netScore: number;
  thru: number;
  coursePar: number
};

export type Leaderboard = LeaderboardRow[];
