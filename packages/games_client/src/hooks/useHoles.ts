import { createMemo } from 'solid-js';

import type { Hole } from '~/lib/hole';
import type { CourseHole } from '~/state/schema';

import { useEntities, useEntity } from '~/state/entities';

import { reduceToByIdMap } from '~/lib/utils';

export const useTeamHoles = () => {
  const course = useEntity('course', 'current');
  const session =  useEntity('session', 'current');
  const allScores = useEntities('score');
  const allPlayers = useEntities('player');

  return createMemo(() => {
    const { teamId, tournamentId, roundId } = session() || {};

    if (!teamId) return [];

    // Get Team Players
    const teamPlayers = allPlayers().filter((p) => p.teamId === teamId);
    const teamPlayerIds = new Set(teamPlayers.map((p) => p.id));

    // Filter scores by current round and team/players
    const scores = allScores().filter(
      (s) => {
        // Must belong to current round if roundId is specified
        if (roundId && s.tournamentRoundId && s.tournamentRoundId !== roundId) {
          return false;
        }
        // Must belong to team or team players
        return s.teamId === teamId || (s.playerId && teamPlayerIds.has(s.playerId));
      }
    );

    // Map courseHoleId to Hole Data
    const c = course()
    const courseHolesMap = new Map<number, CourseHole>();
    if (c.meta.holes.length) {
      c.meta.holes.forEach((h: CourseHole) => {
        courseHolesMap.set(h.id, h);
      });
    }

    const playersMap = reduceToByIdMap(teamPlayers, 'id');
    return scores.map((s): Hole => {
      const player = playersMap[s.playerId!];
      const courseHole = courseHolesMap.get(s.courseHoleId);

      return {
        id: s.id,
        scoreId: s.id,
        courseHoleId: s.courseHoleId,
        teamId: teamId,
        playerId: s.playerId!,
        tournamentId: tournamentId!,
        number: courseHole?.number || 0,
        score: s.strokes,
        playerName: player?.name || 'Unknown',
        strokeHole: 0,
        par: courseHole?.par || 0,
        handicap: courseHole?.handicap || 0,
        yardage: courseHole?.yardage || 0,
      };
    });
  });
};
