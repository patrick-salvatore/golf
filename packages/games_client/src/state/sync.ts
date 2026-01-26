import { updateEntity } from '~/state/entities';

import { fetchTournamentById } from '~/api/tournaments';
import { fetchTeamById, fetchTeamPlayersById } from '~/api/teams';
import { fetchCourseDataByTournamentId } from '~/api/course';
import { fetchScores } from '~/api/scores';

import type { SessionState } from './schema';

export async function syncActiveContext(session: SessionState) {
  if (!session) return;

  const promises: Promise<any>[] = [];
  if (session.tournamentId) {
    promises.push(
      fetchTournamentById(session.tournamentId).then((t) => {
        updateEntity('tournament', t.id, t);
      }),
    );

    promises.push(
      fetchCourseDataByTournamentId(session.tournamentId).then((c) => {
        updateEntity('course', 'current', c);
      }),
    );
  }

  if (session.teamId) {
    promises.push(
      fetchTeamById(session.teamId).then((t) => {
        updateEntity('team', t.id, t);
      }),
    );

    promises.push(
      fetchTeamPlayersById(session.teamId).then((players) =>
        players.map((p) =>
          updateEntity('player', p.id, { ...p, teamId: session.teamId }),
        ),
      ),
    );
  }

  if (session.tournamentId && session.teamId) {
    promises.push(
      fetchScores({
        tournamentId: session.tournamentId,
        teamId: session.teamId,
      }).then((scores) => scores.map((s) => updateEntity('score', s.id, s))),
    );
  }

  await Promise.allSettled(promises);
}
