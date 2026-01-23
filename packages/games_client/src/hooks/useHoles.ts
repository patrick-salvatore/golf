import { createMemo } from 'solid-js';

import type { ScoreEntity, Hole } from '~/lib/hole';
import type { CourseHole } from '~/lib/course';
import type { PlayerState } from '~/state/schema';

import { useEntities } from '~/state/entities';
import { useCourseStore } from '~/state/course';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';
import { reduceToByIdMap } from '~/lib/utils';

export const useTeamHoles = () => {
  const course = useCourseStore(identity);
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

    const playersMap = reduceToByIdMap(teamPlayers, 'id');
    // Map courseHoleId to Hole Data
    const courseHolesMap = new Map<number, CourseHole>();
    if (Array.isArray(course().holes)) {
      course().holes.forEach((h: CourseHole) => {
        courseHolesMap.set(h.id, h);
      });
    }

    console.log(scores);
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
