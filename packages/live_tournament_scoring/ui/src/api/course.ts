import { toCourse, type CourseResponse } from "~/lib/course";
import client from "./client";

export async function getCourses() {
  return client.get<CourseResponse[]>(`/v1/courses`).then((res) => res.data);
}

export async function getCourseDataByTournamentId(tournamentId: string) {
  return client
    .get<CourseResponse>(`/v1/course/${tournamentId}`)
    .then((res) => toCourse(res.data));
}
