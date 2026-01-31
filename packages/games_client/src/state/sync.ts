import { updateEntity } from '~/state/entities';

import {
  fetchCourseDataByRoundId,
  fetchTournamentRounds,
} from '~/api/tournament_round';
import { fetchTournamentById } from '~/api/tournaments';
import { fetchTeamById, fetchTeamPlayersById } from '~/api/teams';
import { fetchRoundScores, fetchScores } from '~/api/scores';

import type { SessionState } from './schema';
import { batch } from 'solid-js';

export async function syncActiveContext(session: SessionState) {
  if (!session) return;

  const promises: Promise<any>[] = [];
  if (session.tournamentId) {
    promises.push(
      fetchTournamentById(session.tournamentId).then((t) => {
        updateEntity('tournament', 'current', t);
      }),
    );
    promises.push(
      fetchCourseDataByRoundId(session.tournamentId).then((c) => {
        updateEntity('course', 'current', c);
      }),
    );
    promises.push(
      fetchTournamentRounds(session.tournamentId).then((tr) => {
        batch(() => {
          tr.forEach((r) => {
            if (r.status === 'active') {
              updateEntity('tournament_round', 'current', r);
            }
            updateEntity('tournament_round', r.id, r);
          });
        });
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
      fetchTeamPlayersById(session.teamId).then((players) => {
        batch(() => {
          players.forEach((p) =>
            updateEntity('player', p.id, { ...p, teamId: session.teamId }),
          );
        });
      }),
    );
  }

  if (session.roundId && session.teamId) {
    promises.push(
      fetchRoundScores({
        roundId: session.roundId,
        teamId: session.teamId,
      }).then((scores) => {
        batch(() => {
          scores.forEach((s) => updateEntity('score', s.id, s));
        });
      }),
    );
  }

  return Promise.allSettled(promises);
}
