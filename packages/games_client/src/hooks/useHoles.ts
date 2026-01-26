import { createMemo } from 'solid-js';

import type { ScoreEntity, Hole } from '~/lib/hole';
import type { CourseHole, PlayerState } from '~/state/schema';

import { useEntities, useEntityById } from '~/state/entities';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';
import { reduceToByIdMap } from '~/lib/utils';

export const useTeamHoles = () => {
  const course = useEntityById('course');
  const session = useSessionStore(identity);
  const allScores = useEntities<ScoreEntity>('score');
  const allPlayers = useEntities<PlayerState>('player');

  return createMemo(() => {
    const { teamId, tournamentId } = session() || {};

    if (!teamId) return [];

    // Get Team Players
    const teamPlayers = allPlayers().filter((p) => p.teamId === teamId);
    const teamPlayerIds = new Set(teamPlayers.map((p) => p.id));

    const scores = allScores().filter(
      (s) =>
        s.teamId === teamId || (s.playerId && teamPlayerIds.has(s.playerId)),
    );

    // Map courseHoleId to Hole Data
    const c = course('current')
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
