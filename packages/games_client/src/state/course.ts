import { createMemo, type Accessor } from 'solid-js';

import { reduceToByIdMap } from '~/lib/utils';

import { useEntities } from './entities';
import type { CourseState } from './schema';
import { useSessionStore } from './session';

// Helper to parse JSON fields
const parseCourse = (c: CourseState) => {
  return {
    ...c,
    holes: typeof c.holes === 'string' ? JSON.parse(c.holes) : c.holes,
    tees: typeof c.tees === 'string' ? JSON.parse(c.tees) : c.tees,
  };
};

type State = ReturnType<typeof parseCourse>;

export function useCourseStore(): { store: Accessor<State> };
export function useCourseStore<T>(selector: (s: State) => T): () => T;
export function useCourseStore<T>(selector?: (s: State) => T) {
  const tournamentId = useSessionStore((s) => s?.tournamentId);
  const allCourses = useEntities<CourseState>('course', );

  const store = createMemo(() => {
    const tid = tournamentId();
    if (!tid)
      return {
        id: 0,
        name: '',
        holes: [],
        tees: [],
        tournamentId: 0,
      } as State;

    const c = allCourses().find((course) => course.tournamentId === tid);

    if (!c)
      return {
        id: 0,
        name: '',
        holes: [],
        tees: [],
        tournamentId: 0,
      } as State;

    return parseCourse(c);
  });

  if (selector) {
    return () => selector(store());
  }

  return { store };
}

export const selectCourseHoles = (s: any) => {
  return reduceToByIdMap(s.holes || [], 'number');
};
