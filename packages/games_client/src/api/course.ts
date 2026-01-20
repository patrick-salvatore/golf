import { toCourse, type ServerCourseResponse } from '~/lib/course';
import client from './client';

export async function getCourses() {
  return client.get<ServerCourseResponse[]>('/v1/courses').then((res) => res.data);
}

export async function getCourseDataByTournamentId(tournamentId: number) {
  return client
    .get<ServerCourseResponse>(`/v1/tournaments/${tournamentId}/course`)
    .then((res) => toCourse(res.data, tournamentId));
}
