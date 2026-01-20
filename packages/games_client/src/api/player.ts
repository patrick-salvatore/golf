import type { Player } from '~/lib/team';
import client from './client';

export async function getPlayers() {
  return client.get<Player[]>(`/v1/players`).then((res) => res.data);
}

export async function createPlayerSelection({
  playerId,
  tournamentId,
  teamId,
}) {
  return client.post('/v1/tournament/players/select', {
    playerId: playerId,
    tournamentId: tournamentId,
    teamId: teamId,
  });
}

export async function getActivePlayers(
  tournamentId: number,
  playerId?: number,
) {
  let query = `tournamentId=${tournamentId}`;
  if (playerId) {
    query += `&playerId=${playerId}`;
  }

  return client
    .get<Player[]>(`/v1/tournament/players/available?${query}`)
    .then((res) => res.data);
}

export async function getPlayersByTournament(tournamentId: string) {
  return client
    .get<Player[]>(`/v1/tournament/${tournamentId}/players`)
    .then((res) => res.data);
}

export async function createPlayer(data: {
  name: string;
  handicap: number;
  isAdmin?: boolean;
}) {
  return client.post<Player>(`/v1/players`, data).then((res) => res.data);
}
