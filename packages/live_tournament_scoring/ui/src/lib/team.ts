export type PlayerId = string;

export type Player = {
  id: PlayerId;
  name: string;
  handicap: number;
  teamId: string;
  tee: string;
};

export type TeamProps = {
  id: string;
  name: string;
  displayName: string;
  tournamentId: string;
  started: boolean;
  finished: boolean;
};

export type Team = TeamProps & {
  players: Player[];
};

export type Teams = Team[];

export type UpdateTeamPayload = Partial<Team>;
