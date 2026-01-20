import type { UpdateHolePayload, Hole } from '~/lib/hole';
import client from './client';

export async function updateHoles(payload: UpdateHolePayload[]) {
  const promises = payload.map((p) => {
    return client.post('/v1/scores', p);
  });
  return Promise.all(promises);
}

export async function getPlayerHoles(playerId: number, tournamentId: number): Promise<Hole[]> {
  return client.get<any[]>(`/v1/scores?tournamentId=${tournamentId}&playerId=${playerId}`)
    .then(res => res.data.map(mapScoreToHole));
}

export async function getTournamentHoles(tournamentId: number): Promise<Hole[]> {
  return client.get<any[]>(`/v1/scores?tournamentId=${tournamentId}`)
    .then(res => res.data.map(mapScoreToHole));
}

export async function getTeamHoles(teamId: number, tournamentId: number): Promise<Hole[]> {
  return client.get<any[]>(`/v1/scores?tournamentId=${tournamentId}&teamId=${teamId}`)
    .then(res => res.data.map(mapScoreToHole));
}

function mapScoreToHole(s: any): Hole {
    return {
        id: s.id.toString(),
        scoreId: s.id,
        courseHoleId: s.courseHoleId,
        playerId: s.playerId,
        tournamentId: s.tournamentId,
        teamId: s.teamId,
        number: s.holeNumber || 0, // Server now provides this
        score: s.strokes.toString(),
        playerName: '', // Can't resolve here without player list
        strokeHole: 0,
        par: 0,
        handicap: 0,
        yardage: 0
    };
}
