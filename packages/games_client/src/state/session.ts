import { createMemo, type Accessor } from 'solid-js';
import { useEntity } from './entities';
import type { SessionState } from './schema';
import { updateEntity } from './entities';

type State = SessionState | null;

export function useSessionStore(): {
  store: Accessor<State>;
  set: (data: Partial<SessionState>) => void;
};
export function useSessionStore<T>(selector: (s: State) => T): () => T;
export function useSessionStore<T>(selector?: (s: State) => T) {
  // Use reactive hook to get 'session' entity 'current'
  const session = useEntity<SessionState>('session', 'current');

  const store = createMemo(() => session() || null);

  if (selector) {
    return () => selector(store());
  }

  const set = (data: Partial<SessionState>) => {
    const current = session();
    if (current) {
      updateEntity('session', 'current', { ...current, ...data });
    } else {
      // Should not happen if initialized, but handle it
      updateEntity('session', 'current', { id: 'current', ...data });
    }
  };

  return { store, set };
}
