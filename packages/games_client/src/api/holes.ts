import type { UpdateHolePayload } from '~/lib/hole';
import client from './client';

export async function updateHoles(payload: UpdateHolePayload[]) {
  const promises = payload.map((p) => {
    return client.post('/v1/scores', p);
  });
  return Promise.all(promises);
}

export async function getPlayerHoles(_playerId: string) {
  // Not used?
  return Promise.resolve([]);
}

export async function getTournamentHoles(_tournamentId: string) {
    // Not used?
  return Promise.resolve([]);
}

export async function getTeamHoles(_teamId: string) {
    // Not used?
  return Promise.resolve([]);
}
