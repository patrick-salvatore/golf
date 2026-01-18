export type CourseHole = { number: number; par: number; handicap: number };

export type Course = {
  id: string;
  name: string;
  tees: any[];
  holes: CourseHole[];
};

export type CourseResponse = {
  id: string;
  meta: { holes?: CourseHole[]; tees: string[] };
  name: string;
};

export function toCourse(res: CourseResponse): Course {
  return {
    ...res,
    holes: res.meta.holes,
    tees: res.meta.tees,
  };
}
