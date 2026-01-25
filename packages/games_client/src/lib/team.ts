import type { TeamState, PlayerState } from '~/state/schema';

export type Team = TeamState;
export type Player = PlayerState;
export type PlayerId = number;

export type AvailablePlayer = {
  handicap: number;
  name: string;
  playerId: number;
  teamId: number;
  tournamentId: number;
};

export type UpdateTeamPayload = Partial<Team>;
