import { updateEntity } from '~/state/entities';

import { getTournamentById, getTournaments } from '~/api/tournaments';
import { getTeamById } from '~/api/teams';
import { getCourseDataByTournamentId } from '~/api/course';

import type { SessionState } from './schema';

export async function syncActiveContext(session: SessionState) {
  if (!session) return;

  const promises: Promise<any>[] = [];
  if (session.tournamentId) {
    promises.push(
      getTournamentById(session.tournamentId).then((t) => {
        updateEntity('tournament', t.id, {
          id: t.id,
          name: t.name,
          courseId: t.courseId,
          formatId: t.formatId,
          teamCount: t.teamCount,
          awardedHandicap: t.awardedHandicap,
          isMatchPlay: t.isMatchPlay,
          complete: t.complete,
          created: t.created,
        });
      }),
    );

    promises.push(
      getCourseDataByTournamentId(session.tournamentId).then((c) => {
        updateEntity('course', c.id, {
          id: c.id,
          name: c.name,
          holes: c.holes,
          tees: c.tees,
          tournamentId: c.tournamentId,
        });
      }),
    );
  }

  if (session.teamId) {
    promises.push(
      getTeamById(session.teamId).then((t) => {
        updateEntity('team', t.id, {
          id: t.id,
          name: t.name,
          tournamentId: t.tournamentId,
          started: t.started,
          finished: t.finished,
        });
      }),
    );
  }

  // Also fetch all tournaments if needed (legacy logic)
  promises.push(
    getTournaments().then((tournaments) => {
      for (const t of tournaments) {
        updateEntity('tournament', t.id, {
          id: t.id,
          name: t.name,
          courseId: t.courseId,
          formatId: t.formatId,
          teamCount: t.teamCount,
          awardedHandicap: t.awardedHandicap,
          isMatchPlay: t.isMatchPlay,
          complete: t.complete,
          created: t.created,
        });
      }
    }),
  );

  await Promise.allSettled(promises);
}
