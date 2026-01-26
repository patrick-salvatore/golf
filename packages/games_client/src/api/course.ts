import type { CourseState } from '~/state/schema';
import client from './client';

export async function fetchCourses() {
  return client
    .get<CourseState[]>('/v1/courses')
    .then((res) => res.data);
}

export async function fetchCourseDataByTournamentId(tournamentId: number) {
  return client
    .get<CourseState>(`/v1/tournaments/${tournamentId}/course`)
    .then((res) => res.data);
}
