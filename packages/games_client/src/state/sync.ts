import { updateEntity } from '~/state/entities';

import { getTournamentById } from '~/api/tournaments';
import { getTeamById, getTeamPlayersById } from '~/api/teams';
import { getCourseDataByTournamentId } from '~/api/course';
import { getScores } from '~/api/scores';

import type { SessionState } from './schema';

export async function syncActiveContext(session: SessionState) {
  if (!session) return;

  const promises: Promise<any>[] = [];
  if (session.tournamentId) {
    promises.push(
      getTournamentById(session.tournamentId).then((t) => {
        updateEntity('tournament', t.id, t);
      }),
    );

    promises.push(
      getCourseDataByTournamentId(session.tournamentId).then((c) => {
        updateEntity('course', c.id, c);
      }),
    );
  }

  if (session.teamId) {
    promises.push(
      getTeamById(session.teamId).then((t) => {
        updateEntity('team', t.id, t);
      }),
    );

    promises.push(
      getTeamPlayersById(session.teamId).then((players) =>
        players.map((p) => updateEntity('player', p.id, p)),
      ),
    );
  }

  if (session.tournamentId && session.teamId) {
    promises.push(
      getScores({
        tournamentId: session.tournamentId,
        teamId: session.teamId,
      }).then((scores) => scores.map((s) => updateEntity('score', s.id, s))),
    );
  }

  await Promise.allSettled(promises);
}
