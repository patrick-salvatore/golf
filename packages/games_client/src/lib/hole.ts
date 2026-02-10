export interface ScoreEntity {
  id: number;
  tournamentRoundId?: number; // New field for round-specific scoring
  playerId?: number;
  teamId?: number;
  courseHoleId: number;
  strokes: number;
  createdAt: string;
}

// UI representation
export interface Hole {
  id?: number;
  scoreId?: number;
  courseHoleId?: number;
  
  number: number;
  par: number;
  handicap: number;
  yardage: number;
  
  playerId: number;
  teamId: number;
  tournamentId: number;
  playerName: string;
  
  score: number;
  strokeHole: number;
}

export type UpdateScorePayload = {
  tournamentId?: number; 
  roundId?: number;
  playerId?: number;
  teamId?: number;
  courseHoleId: number;
  strokes: number;
};
