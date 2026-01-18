import client from "./client";
import type { Tournament, TournamentFormat } from "~/lib/tournaments";

export async function getTournamentFormats() {
  return client
    .get<TournamentFormat[]>(`/v1/tournament_formats`)
    .then((res) => res.data);
}

export async function getTournamentById(id: string) {
  return client.get<Tournament>(`/v1/tournament/${id}`).then((res) => res.data);
}

export async function startTournament({
  teamId,
  tournamentId: tournamentId,
}: {
  teamId: string;
  tournamentId: string;
}) {
  return client.post<void>(
    `/v1/tournament/${tournamentId}/team/${teamId}/start`
  );
}

export async function createTournament(data) {
  return client
    .post<Tournament>(`/v1/tournaments`, data)
    .then((res) => res.data);
}

export async function getTournaments() {
  return client.get<Tournament[]>(`/v1/tournaments`).then((res) => res.data);
}

export async function updateTournament(tournamentId, data) {
  return client
    .put<Tournament>(`/v1/tournaments/${tournamentId}`, data)
    .then((res) => res.data);
}

export async function deleteTournament(tournamentId: string) {
  return client
    .delete<Tournament>(`/v1/tournaments/${tournamentId}`)
    .then((res) => res.data);
}
