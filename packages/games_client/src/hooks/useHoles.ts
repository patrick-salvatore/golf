import { createMemo } from 'solid-js';

import type { ScoreEntity, Hole } from '~/lib/hole';
import type { CourseHole } from '~/lib/course';

import { useEntities } from '~/state/entities';
import { useTeamStore, selectTeamPlayersMap } from '~/state/team';
import { useCourseStore } from '~/state/course';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';

export const useTournamentScores = () => {
  const scores = useEntities<ScoreEntity>('score');
  return scores;
};

export const useTeamHoles = () => {
  const session = useSessionStore(identity);

  const allScores = useTournamentScores();
  const team = useTeamStore((s) => s);
  const course = useCourseStore((s) => s);

  return createMemo(() => {
    const { teamId , playerId, tournamentId} = session() || {};

    if (!teamId) return [];

    const scores = allScores().filter(
      (s) => s.teamId === teamId || isPlayerOnTeam(s.playerId, team),
    );

    const playersMap = selectTeamPlayersMap(team());
    // Map courseHoleId to Hole Data
    const courseHolesMap = new Map<number, CourseHole>();
    if (Array.isArray(course().holes)) {
      course().holes.forEach((h: CourseHole) => {
        courseHolesMap.set(h.id, h);
      });
    }

    return scores.map((s): Hole => {
      const player = playersMap[s.playerId!];
      const courseHole = courseHolesMap.get(s.courseHoleId);

      return {
        id: s.id,
        scoreId: s.id,
        courseHoleId: s.courseHoleId,
        teamId: teamId,
        playerId: playerId,
        tournamentId: tournamentId,
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

const isPlayerOnTeam = (playerId: number | undefined, team: any) => {
  if (!playerId) return false;
  const players = team().players || [];
  return players.some((p: any) => p.id === playerId);
};
