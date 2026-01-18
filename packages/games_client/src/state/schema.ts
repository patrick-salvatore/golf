// Pure TypeScript definitions, no LiveStore dependencies

// These objects are just placeholders/definitions if needed for runtime checks, 
// but primarily we export the Interfaces below.

export const Session = {
  id: "string",
  token: "string",
  teamId: "string", // optional
  tournamentId: "string", // optional
  playerId: "string", // optional
  isAdmin: "boolean", // optional
};

export const Tournament = {
  id: "string",
  name: "string",
  uuid: "string",
  awardedHandicap: "number",
  isMatchPlay: "boolean",
  status: "string", // optional
};

export const Round = {
  id: "string",
  tournamentId: "string",
  playerId: "string",
  status: "string",
  score: "string", // optional
  startedAt: "string", // optional
};

export const Team = {
  id: "string",
  name: "string",
  displayName: "string",
  tournamentId: "string",
  started: "boolean",
  finished: "boolean",
};

export const Player = {
  id: "string",
  name: "string",
  handicap: "number",
  teamId: "string",
  tee: "string", // optional
};

export const Course = {
  id: "string",
  name: "string",
  holes: "any", // JSON
  tees: "any", // JSON
  tournamentId: "string",
};


// Interfaces
export interface SessionState {
  id: string;
  token: string;
  teamId?: string;
  tournamentId?: string;
  playerId?: string;
  isAdmin?: boolean;
}

export interface TournamentState {
  id: string;
  name: string;
  uuid: string;
  awardedHandicap: number;
  isMatchPlay: boolean;
  status?: string;
}

export interface RoundState {
  id: string;
  tournamentId: string;
  playerId: string;
  status: string;
  score?: string;
  startedAt?: string;
}

export interface TeamState {
  id: string;
  name: string;
  displayName: string;
  tournamentId: string;
  started: boolean;
  finished: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  handicap: number;
  teamId: string;
  tee?: string;
}

export interface CourseState {
  id: string;
  name: string;
  holes: any;
  tees: any;
  tournamentId: string;
}
