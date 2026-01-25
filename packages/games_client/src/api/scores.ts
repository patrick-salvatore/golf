import client from './client';
import type { ScoreState } from '~/state/schema';

export async function fetchScores(params: {
  tournamentId: number;
  playerId?: number;
  teamId?: number;
}) {
  let query = `tournamentId=${params.tournamentId}`;
  if (params.playerId) {
    query += `&playerId=${params.playerId}`;
  }
  if (params.teamId) {
    query += `&teamId=${params.teamId}`;
  }

  return client
    .get<ScoreState[]>(`/v1/scores?${query}`)
    .then((res) => res.data);
}
