import { createSignal, type Accessor, type Setter } from "solid-js";

import type { Player, PlayerId, Team, TeamProps } from "~/lib/team";
import type { InitFn } from "./helpers";
import { reduceToByIdMap } from "~/lib/utils";

type TeamMap = Team;
type State = TeamMap;

const inititalState = {
  id: "",
  name: "",
  displayName: "",
  tournamentId: "",
  started: false,
  finished: false,
  players: [],
} as Team;
const [store, _setStore] = createSignal<State>(inititalState);

export function useTeamStore(): {
  store: Accessor<State>;
  set: Setter<State>;
  init: (team: TeamProps, players: Player[]) => Team;
};
export function useTeamStore<T>(selector: (s: State) => T): () => T;
export function useTeamStore<T>(selector?: (s: State) => T) {
  if (selector) {
    return () => selector(store());
  }

  const init = (team: TeamProps, players: Player[]) =>
    _setStore(() => ({ ...team, players }));

  return { init, store, set: _setStore };
}

export const selectTeamPlayersMap = (state: State) =>
  reduceToByIdMap(state.players, "id");
