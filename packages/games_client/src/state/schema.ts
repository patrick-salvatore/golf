export const Session = {
  id: 'string',
  token: 'string',
  teamId: 'string',
  tournamentId: 'string',
  playerId: 'string',
  isAdmin: 'boolean',
};

export const TournamentFormat = {
  id: 'number',
  name: 'string',
  description: 'string',
};

export const Tournament = {
  id: 'number',
  name: 'string',
  courseId: 'number',
  formatId: 'number',
  teamCount: 'number',
  awardedHandicap: 'number',
  isMatchPlay: 'boolean',
  complete: 'boolean',
  startTime: 'string',
  created: 'string',
};

export const Team = {
  id: 'number',
  name: 'string',
  tournamentId: 'number',
  started: 'boolean',
  finished: 'boolean',
};

export const Player = {
  id: 'number',
  name: 'string',
  handicap: 'number',
  teamId: 'number',
  tee: 'string',
  isAdmin: 'boolean',
  createdAt: 'string',
};

export const Course = {
  id: 'number',
  name: 'string',
  holes: 'any',
  tees: 'any',
  tournamentId: 'number',
};

export const Invite = {
  token: 'string',
  tournamentId: 'number',
  teamId: 'number',
  expiresAt: 'string',
  createdAt: 'string',
  active: 'boolean',
};

export const Score = {
  id: 'number',
  tournamentId: 'number',
  playerId: 'number',
  teamId: 'number',
  holeNumber: 'number',
  strokes: 'number',
  putts: 'number',
  createdAt: 'string',
};

export interface SessionState {
  id: string;
  token: string;
  teamId?: number
  tournamentId?: number
  playerId?: number
  isAdmin?: boolean;
}

export interface TournamentFormatState {
  id: number
  name: string;
  description?: string;
}

export interface TournamentState {
  id: number
  name: string;
  courseId: number
  formatId: number
  teamCount: number;
  awardedHandicap: number;
  isMatchPlay: boolean;
  complete: boolean;
  startTime?: string;
  created: string;
}

export interface TeamState {
  id: number
  name: string;
  tournamentId: number
  started: boolean;
  finished: boolean;
}

export interface PlayerState {
  id: number;
  name: string;
  handicap: number;
  teamId: number
  tee?: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface CourseState {
  id: number
  name: string;
  holes: any;
  tees: any;
  tournamentId: number
}

export interface InviteState {
  token: string;
  tournamentId: number
  teamId?: number
  expiresAt: string;
  createdAt: string;
  active: boolean;
}

export interface ScoreState {
  id: number
  tournamentId: number
  playerId?: number
  teamId?: number
  holeNumber: number;
  strokes: number;
  putts: number;
  createdAt: string;
}
