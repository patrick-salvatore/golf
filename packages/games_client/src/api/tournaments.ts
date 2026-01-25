import client from './client';
import type { Tournament, TournamentFormat } from '~/lib/tournaments';

export async function fetchTournamentFormats() {
  return client
    .get<TournamentFormat[]>(`/v1/tournament_formats`)
    .then((res) => res.data);
}

export async function fetchTournamentById(id: number) {
  return client.get<Tournament>(`/v1/tournament/${id}`).then((res) => res.data);
}

export async function createTournament(data) {
  return client
    .post<Tournament>(`/v1/tournaments`, data)
    .then((res) => res.data);
}

export async function fetchTournaments() {
  return client.get<Tournament[]>(`/v1/tournaments`).then((res) => res.data);
}

export async function updateTournament(tournamentId: number, data) {
  return client
    .put<Tournament>(`/v1/tournaments/${tournamentId}`, data)
    .then((res) => res.data);
}

export async function deleteTournament(tournamentId: string) {
  return client
    .delete<Tournament>(`/v1/tournaments/${tournamentId}`)
    .then((res) => res.data);
}
