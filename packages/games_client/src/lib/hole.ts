export interface ScoreEntity {
  id: number;
  tournamentId: number;
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

export type UpdateHolePayload = {
  tournamentId: number;
  playerId?: number;
  teamId?: number;
  courseHoleId: number;
  strokes: number;
};
