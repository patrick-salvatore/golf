export type Score = string;

export type Hole = {
  strokeHole: number;
  id: string;
  playerId: string;
  tournamentId: string;
  number: number;
  score: string;
  teamId?: string;
  playerName: string;
};

export type HoleWithMetadata = {
  id: string;
  score: string;
  number: number;
  playerId: string;
  teamId: string;
  playerHandicap: string;
  awardedTournamentHandicap: number;
};

export type UpdateHolePayload = Partial<Hole>;
