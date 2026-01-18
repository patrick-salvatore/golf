import type { Player, Team, UpdateTeamPayload } from "~/lib/team";

import client, { rawClient } from "./client";
import type { TeamAssignment } from "~/lib/auth";
import type { Hole } from "~/lib/hole";

export async function getTeamByTournamentId(tournamentId: string) {
  return client
    .get<Team[]>(`/v1/tournaments/${tournamentId}/teams`)
    .then((res) => res.data);
}

export async function getTeamById(teamId: string) {
  return client.get<Team>(`/v1/team/${teamId}`).then((res) => res.data);
}

export async function getTeamPlayersById(teamId: string) {
  return client
    .get<Player[]>(`/v1/team/${teamId}/players`)
    .then((res) => res.data);
}

export async function updateTeam(teamId: string, data: UpdateTeamPayload) {
  return client.put<Team>(`/v1/team/${teamId}`, data).then((res) => res.data);
}

export async function assignTeam(teamId: string) {
  return rawClient
    .post<TeamAssignment>(`/v1/team/${teamId}/assign`)
    .then((res) => res.data);
}
