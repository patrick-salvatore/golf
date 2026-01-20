import type { Player, Team, UpdateTeamPayload } from '~/lib/team';

import client, { rawClient } from './client';
import type { TeamAssignment } from '~/lib/auth';

export async function getTeamByTournamentId(tournamentId: number) {
  return client
    .get<Team[]>(`/v1/tournaments/${tournamentId}/teams`)
    .then((res) => res.data);
}

export async function getTeamById(teamId: number) {
  return client.get<Team>(`/v1/teams/${teamId}`).then((res) => res.data);
}

export async function getTeamPlayersById(teamId: number) {
  return client
    .get<Player[]>(`/v1/teams/${teamId}/players`)
    .then((res) => res.data);
}

export async function updateTeam(teamId: number, data: UpdateTeamPayload) {
  return client.put<Team>(`/v1/teams/${teamId}`, data).then((res) => res.data);
}

export async function assignTeam(teamId: number) {
  return rawClient
    .post<TeamAssignment>(`/v1/teams/${teamId}/assign`)
    .then((res) => res.data);
}
