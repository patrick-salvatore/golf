import type { AvailablePlayer, Player } from '~/lib/team';
import client from './client';
import type { TokenData } from '~/lib/auth';

export async function fetchPlayers() {
  return client.get<Player[]>(`/v1/players`).then((res) => res.data);
}

export async function createPlayerSelection({
  playerId,
  tournamentId,
  teamId,
  inviteToken,
}: {
  playerId: number;
  tournamentId: number;
  teamId: number;
  inviteToken: string;
}) {
  return client.post<TokenData>('/v1/tournament/players/select', {
    playerId: playerId,
    tournamentId: tournamentId,
    teamId: teamId,
  }, {
    headers: {
      'X-Invite-Token': inviteToken
    }
  }).then(res => res.data)
}

export async function fetchActivePlayers(
  tournamentId: number,
  playerId?: number,
) {
  let query = `tournamentId=${tournamentId}`;
  if (playerId) {
    query += `&playerId=${playerId}`;
  }

  return client
    .get<AvailablePlayer[]>(`/v1/tournament/players/available?${query}`)
    .then((res) => res.data);
}

export async function fetchPlayersByTournament(tournamentId: number | string) {
  return client
    .get<Player[]>(`/v1/tournaments/${tournamentId}/players`)
    .then((res) => res.data);
}

export async function updatePlayer(
  playerId: number,
  data: {
    name: string;
    handicap: number;
    active: boolean;
    team_id: number;
  }
) {
  return client
    .put<Player>(`/v1/players/${playerId}`, data)
    .then((res) => res.data);
}

export async function createPlayer(data: {
  name: string;
  handicap: number;
  isAdmin?: boolean;
}) {
  return client.post<Player>(`/v1/players`, data).then((res) => res.data);
}

export async function fetchTeamPlayers(teamId: number) {
  return client
    .get<Player[]>(`/v1/teams/${teamId}/players`)
    .then((res) => res.data);
}
