import type { UpdateScorePayload, Hole } from '~/lib/hole';
import client from './client';

export async function updateHoles(payload: UpdateScorePayload[]) {
  return client.post('/v1/scores', payload);
}

export async function updateTeamHole(payload: UpdateScorePayload) {
  return client.post('/v1/scores/team', payload);
}

// Round-aware score submission
export async function updateRoundHoles(roundId: number, payload: UpdateScorePayload[]) {
  return client.post(`/v1/round/${roundId}/scores`, payload);
}

export async function updateRoundTeamHole(roundId: number, payload: UpdateScorePayload) {
  return client.post(`/v1/round/${roundId}/scores`, payload);
}

export async function fetchPlayerHoles(
  playerId: number,
  tournamentId: number,
): Promise<Hole[]> {
  return client
    .get<any[]>(`/v1/scores?tournamentId=${tournamentId}&playerId=${playerId}`)
    .then((res) => res.data.map(mapScoreToHole));
}

export async function fetchTournamentHoles(
  tournamentId: number,
): Promise<Hole[]> {
  return client
    .get<any[]>(`/v1/scores?tournamentId=${tournamentId}`)
    .then((res) => res.data.map(mapScoreToHole));
}

export async function fetchTeamScores(teamId: number, tournamentId: number) {
  return client
    .get<any[]>(`/v1/scores?tournamentId=${tournamentId}&teamId=${teamId}`)
    .then((res) => res.data);
}

export async function fetchTeamHoles(
  teamId: number,
  tournamentId: number,
): Promise<Hole[]> {
  return client
    .get<any[]>(`/v1/scores?tournamentId=${tournamentId}&teamId=${teamId}`)
    .then((res) => res.data.map(mapScoreToHole));
}

// Round-aware score fetching
export async function fetchRoundTeamHoles(
  roundId: number,
  teamId: number,
): Promise<Hole[]> {
  return client
    .get<any[]>(`/v1/round/${roundId}/scores?teamId=${teamId}`)
    .then((res) => res.data.map(mapScoreToHole));
}

function mapScoreToHole(s: any): Hole {
  return {
    id: s.id,
    scoreId: s.id,
    playerId: s.playerId,
    tournamentId: s.tournamentId,
    teamId: s.teamId,
    number: s.holeNumber || 0, // Server now provides this
    score: s.strokes,
    playerName: '', // Can't resolve here without player list
    strokeHole: 0,
    par: 0,
    handicap: 0,
    yardage: 0,
    courseHoleId: s.courseHoleId,
  };
}
