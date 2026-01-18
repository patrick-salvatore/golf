import { createSignal, type Accessor, type Setter } from "solid-js";

import type { Course } from "~/lib/course";
import type { InitFn } from "./helpers";
import { reduceToByIdMap } from "~/lib/utils";

type State = Course;

const [store, _setStore] = createSignal<State>({} as Course);

export function useCourseStore(): {
  store: Accessor<State>;
  set: Setter<State>;
  init: (data: State) => void;
};
export function useCourseStore<T>(selector: (s: State) => T): () => T;
export function useCourseStore<T>(selector?: (s: State) => T) {
  if (selector) {
    return () => selector(store());
  }

  const init: InitFn<State> = (state) => _setStore(() => state);

  return { init, set: _setStore, store };
}

export const selectCourseHoles = (s: State) => {
  return reduceToByIdMap(s.holes || [], "number");
};
