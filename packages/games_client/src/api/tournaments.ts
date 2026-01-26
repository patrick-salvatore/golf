import client from './client';
import type { Tournament, TournamentFormat } from '~/lib/tournaments';
import type { TournamentRoundState } from '~/state/schema';


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

// Tournament Rounds API
export async function fetchTournamentRounds(tournamentId: number) {
  return client
    .get<TournamentRoundState[]>(`/v1/tournament/${tournamentId}/rounds`)
    .then((res) => res.data);
}

export async function fetchTournamentRound(roundId: number) {
  return client
    .get<TournamentRoundState>(`/v1/round/${roundId}`)
    .then((res) => res.data);
}

export async function createTournamentRound(tournamentId: number, data: {
  roundNumber: number;
  roundDate: string;
  courseId: number;
  teeSet: string;
  name: string;
}) {
  return client
    .post<TournamentRoundState>(`/v1/tournament/${tournamentId}/rounds`, data)
    .then((res) => res.data);
}
