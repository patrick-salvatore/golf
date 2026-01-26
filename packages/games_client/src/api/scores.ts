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

// Round-specific scores API
export async function fetchRoundScores(params: {
  roundId: number;
  playerId?: number;
  teamId?: number;
}) {
  let query = '';
  if (params.playerId) {
    query += `playerId=${params.playerId}`;
  }
  if (params.teamId) {
    query += (query ? '&' : '') + `teamId=${params.teamId}`;
  }

  const queryString = query ? `?${query}` : '';
  return client
    .get<ScoreState[]>(`/v1/round/${params.roundId}/scores${queryString}`)
    .then((res) => res.data);
}

export async function submitRoundScore(roundId: number, data: {
  playerId?: number;
  teamId?: number;
  courseHoleId: number;
  strokes: number;
}) {
  return client
    .post(`/v1/round/${roundId}/scores`, data)
    .then((res) => res.data);
}
