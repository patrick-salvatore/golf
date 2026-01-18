import { createSignal, type Accessor, type Setter } from "solid-js";
import type { Session } from "~/lib/auth";

type State = Session | null;

const [store, _setStore] = createSignal<State>(null);

export function useSessionStore(): {
  store: Accessor<State>;
  set: Setter<State>;
};
export function useSessionStore<T>(selector: (s: State) => T): () => T;
export function useSessionStore<T>(selector?: (s: State) => T) {
  if (selector) {
    return () => selector(store());
  }

  return { store, set: _setStore };
}
