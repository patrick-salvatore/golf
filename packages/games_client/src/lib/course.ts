import type { CourseState } from '~/state/schema';

export interface CourseHole {
  id: number;
  number: number;
  par: number;
  handicap: number;
  holeIndex?: number;
  yardage: number;
}

export interface ServerCourseResponse {
  id: number;
  name: string;
  meta: {
    holes: CourseHole[];
    tees: string[];
  };
}

// Alias for backward compatibility
export type CourseResponse = ServerCourseResponse;

export const toCourse = (
  data: ServerCourseResponse,
  tournamentId: number,
): CourseState => {
  return {
    id: data.id,
    name: data.name,
    holes: data.meta?.holes || [],
    tees: data.meta?.tees || [],
    tournamentId: tournamentId,
  };
};
