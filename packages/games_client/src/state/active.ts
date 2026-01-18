import { createMemo } from "solid-js";
import { Schema, queryDb } from "@livestore/livestore";
import { createLiveQuery } from "./live-solid";
import { Tournament, Round, type TournamentState, type RoundState } from "./schema";
import { useSessionStore } from "./session";

export function useActiveTournaments() {
  const queryFn = () => queryDb({
    query: `SELECT * FROM tournaments WHERE status = 'active'`,
    schema: Schema.Array(Tournament) as any,
  }) as any;

  const result = createLiveQuery<TournamentState[]>(queryFn);
  return createMemo(() => result() || []);
}

export function useActiveRounds() {
  const session = useSessionStore(s => s?.playerId);

  const queryFn = () => {
    const playerId = session();
    if (!playerId) return undefined;
    return queryDb({
      query: `SELECT * FROM rounds WHERE playerId = ? AND status = 'active'`,
      bindValues: [playerId],
      schema: Schema.Array(Round) as any,
    }) as any;
  };

  const result = createLiveQuery<RoundState[]>(queryFn);
  return createMemo(() => result() || []);
}
