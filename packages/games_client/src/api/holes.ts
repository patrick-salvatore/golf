import type { Hole, UpdateHolePayload } from "~/lib/hole";
import { mutate } from "~/lib/sync/engine";

import client from "./client";

export async function updateHoles(payload: UpdateHolePayload[]) {
  // We need to know the tournamentId to construct a unique ID?
  // Actually, the ID should probably be stable.
  // The existing `Hole` type has an `id`. If it's present, use it.
  // If not, we might need to rely on the backend or construct one.
  // Assuming the UI provides the ID if it exists, or we generate a deterministic one.
  // For now, let's assume `id` is present or we can derive it.
  // The backend likely expects a specific ID format or UUID.
  // Since we are moving to local-first, let's generate IDs if missing?
  // Or purely rely on `id` being passed.
  
  const promises = payload.map(p => {
    if (!p.id) {
        console.warn("Attempting to update hole without ID", p);
        return Promise.resolve();
    }
    // "hole_score" is the entity type we decided on
    return mutate("hole_score", p.id, p, "upsert");
  });
  
  return Promise.all(promises);
}

export async function getPlayerHoles(playerId: string) {
  return client
    .get<Hole[]>(`/v1/holes?playerId=${playerId}`)
    .then((res) => res.data);
}

export async function getTournamentHoles(tournamentId: string) {
  return client
    .get<Hole[]>(`/v1/holes?tournamentId=${tournamentId}`)
    .then((res) => res.data);
}

export async function getTeamHoles(teamId: string) {
  return client
    .get<Hole[]>(`/v1/holes?teamId=${teamId}`)
    .then((res) => res.data);
}
