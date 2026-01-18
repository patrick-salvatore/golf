import type { Hole, UpdateHolePayload } from "~/lib/hole";

import client from "./client";

export async function updateHoles(payload: UpdateHolePayload[]) {
  return client
    .put<UpdateHolePayload[]>(`/v1/holes`, payload)
    .then((res) => res.data);
}

export async function getPlayerHoles(playerId: string) {
  return client
    .get<Hole[]>(`/v1/holes?playerId=${playerId}`)
    .then((res) => res.data);
}

export async function getTournamentHoles(tournamentId: string) {
  return client
    .get<Hole[]>(`/v1/holes?tournamentId=${tournamentId}`)
    .then((res) => res.data);
}

export async function getTeamHoles(teamId: string) {
  return client
    .get<Hole[]>(`/v1/holes?teamId=${teamId}`)
    .then((res) => res.data);
}
