import { createStore, type SetStoreFunction } from "solid-js/store";

import type { Tournament } from "~/lib/tournaments";
import type { InitFn } from "./helpers";

type State = Tournament;

const inititalState = {
  id: "",
  name: "",
  uuid: "",
  awardedHandicap: 0,
  isMatchPlay: false,
};
const [store, _setStore] = createStore<State>(inititalState);

export function useTournamentStore(): {
  store: State;
  set: SetStoreFunction<State>;
  init: (state: State) => void;
};
export function useTournamentStore<T>(selector: (s: State) => T): () => T;
export function useTournamentStore<T>(selector?: (s: State) => T) {
  if (selector) {
    return () => selector(store);
  }

  const init: InitFn<State> = (state) => _setStore(() => state);

  return { init, store, set: _setStore };
}
