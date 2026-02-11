import type { CourseState } from '~/state/schema';
import client from './client';

export interface CreateCourseRequest {
  name: string;
  tees: string;
  holes: {
    number: number;
    par: number;
    handicap: number;
    yardage: number;
  }[];
}

export async function fetchCourses() {
  return client.get<CourseState[]>('/v1/courses').then((res) => res.data);
}

export async function fetchCourse(id: number) {
  return client.get<CourseState>(`/v1/courses/${id}`).then((res) => res.data);
}

export async function createCourse(data: CreateCourseRequest) {
  return client.post<CourseState>('/v1/courses', data).then((res) => res.data);
}

export async function updateCourse(id: number, data: CreateCourseRequest) {
  return client.put<CourseState>(`/v1/courses/${id}`, data).then((res) => res.data);
}

export async function deleteCourse(id: number) {
  return client.delete(`/v1/courses/${id}`).then((res) => res.data);
}