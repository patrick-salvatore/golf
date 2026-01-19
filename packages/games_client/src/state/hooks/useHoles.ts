import { createMemo } from 'solid-js';
import { useEntities } from '~/state/entities';
import type { ScoreEntity, Hole } from '~/lib/hole';
import { useTeamStore, selectTeamPlayersMap } from '~/state/team';

export const useTournamentScores = () => {
  const scores = useEntities<ScoreEntity>('score');
  return scores;
};

export const useTeamHoles = (teamId: string | undefined) => {
  const allScores = useTournamentScores();
  const team = useTeamStore((s) => s);

  return createMemo(() => {
    if (!teamId) return [];

    const scores = allScores().filter(
      (s) => s.teamId === parseInt(teamId) || isPlayerOnTeam(s.playerId, team),
    );

    const playersMap = selectTeamPlayersMap(team());

    return scores.map((s): Hole => {
      const playerIdStr = s.playerId ? s.playerId.toString() : '';
      const player = playersMap[playerIdStr];
      return {
        id: s.id.toString(),
        playerId: playerIdStr,
        tournamentId: s.tournamentId.toString(),
        teamId: s.teamId ? s.teamId.toString() : teamId,
        number: s.hole,
        score: s.strokes.toString(),
        playerName: player?.name || 'Unknown',
        strokeHole: 0, // Calculated in UI
      };
    });
  });
};

// Helper to check if a score belongs to a player on this team
// (If scores are linked by PlayerID but we are filtering by TeamID view)
const isPlayerOnTeam = (playerId: number | undefined, team: any) => {
  if (!playerId) return false;
  // This requires the team store to be populated correctly
  // Assuming team.players contains the list
  const players = team().players || [];
  return players.some((p: any) => p.id === playerId.toString());
};
