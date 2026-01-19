export type Score = string;

export type ScoreEntity = {
  id: number;
  tournamentId: number;
  playerId?: number;
  teamId?: number;
  hole: number;
  strokes: number;
  putts: number;
  createdAt: string;
};

export type Hole = {
  id?: string; // ID might be missing for unsaved/UI-generated rows
  playerId: string;
  tournamentId: string;
  number: number;
  score: string;
  teamId: string;
  playerName: string;
  strokeHole: number; // Derived on client
};

export type UpdateHolePayload = {
  tournamentId: number;
  playerId?: number;
  teamId?: number;
  holeNumber: number;
  strokes: number;
  putts: number;
};
