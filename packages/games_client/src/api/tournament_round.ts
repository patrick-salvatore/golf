import type { CourseState, TournamentRoundState } from "~/state/schema";
import client from "./client";

export async function fetchCourseDataByRoundId(tournamentId: number) {
  return client
    .get<CourseState>(`/v1/round/${tournamentId}/course`)
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