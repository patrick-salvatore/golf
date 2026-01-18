import client from "./client";
import type { Player } from "~/lib/team";

export async function getPlayers() {
  return client.get<Player[]>(`/v1/players`).then((res) => res.data);
}

export async function getPlayersByTournament(tournamentId: string) {
  return client
    .get<Player[]>(`/v1/tournament/${tournamentId}/players`)
    .then((res) => res.data);
}
