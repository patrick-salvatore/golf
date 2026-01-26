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
  isTeamScoring: 'boolean',
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
  startDate: 'string',
  endDate: 'string',
  totalRounds: 'number',
  created: 'string',
};

export const TournamentRound = {
  id: 'number',
  tournamentId: 'number',
  roundNumber: 'number',
  roundDate: 'string',
  courseId: 'number',
  teeSet: 'string',
  name: 'string',
  status: 'string',
  courseName: 'string',
  createdAt: 'string',
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
  tournamentRoundId: 'number',
  playerId: 'number',
  teamId: 'number',
  courseHoleId: 'number',
  strokes: 'number',
  createdAt: 'string',
};

export interface SessionState {
  id: string;
  token: string;
  teamId?: number;
  tournamentId?: number;
  playerId?: number;
  isAdmin?: boolean;
}

export interface TournamentFormatState {
  id: number;
  name: string;
  description?: string;
  isTeamScoring: boolean;
}

export interface TournamentState {
  id: number;
  name: string;
  courseId?: number; // Made optional for multi-round tournaments
  formatId: number;
  teamCount: number;
  awardedHandicap: number;
  isMatchPlay: boolean;
  complete: boolean;
  isTeamScoring: boolean;
  formatName: string;
  startTime?: string;
  startDate: string;
  endDate: string;
  totalRounds: number;
  created: string;
  rounds?: TournamentRoundState[];
}

export interface TournamentRoundState {
  id: number;
  tournamentId: number;
  roundNumber: number;
  roundDate: string;
  courseId: number;
  teeSet: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  courseName?: string;
  createdAt: string;
}

export interface TeamState {
  id: number;
  name: string;
  tournamentId: number;
  started?: boolean;
  finished?: boolean;
}

export interface PlayerState {
  id: number;
  name: string;
  handicap: number;
  teamId: number;
  tee?: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface CourseState {
  id: number;
  name: string;
  tournamentId: number;
  meta: {
    holes: CourseHole[];
    tees: any;
  };
}

export interface CourseHole {
  id: number;
  number: number;
  par: number;
  handicap: number;
  rawHandicap: number;
  allowedHandicap: number;
  yardage: number;
}

export interface InviteState {
  token: string;
  tournamentId: number;
  teamId?: number;
  expiresAt: string;
  createdAt: string;
  active: boolean;
}

export interface ScoreState {
  id: number;
  tournamentId?: number; // Made optional for backwards compatibility
  tournamentRoundId?: number; // New field for multi-round support
  playerId?: number;
  teamId?: number;
  courseHoleId: number;
  strokes: number;
  createdAt: string;
}
