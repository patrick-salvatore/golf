import { updateEntity } from '~/state/entities';
import { getIdentity } from '~/api/auth';
import { getTournamentById, getTournaments } from '~/api/tournaments';
import { getTeamById, getTeamPlayersById } from '~/api/teams';
import { getCourseDataByTournamentId } from '~/api/course';
import { useSessionStore } from '~/state/session';
import { useEntity } from './entities';
import type { SessionState } from './schema';

export async function syncSession() {
  try {
    const identity = await getIdentity();
    const token = localStorage.getItem('jid')
      ? JSON.parse(localStorage.getItem('jid')!).token
      : '';

    const sessionData: SessionState = {
      id: 'current',
      token: token,
      teamId: identity.teamId || undefined,
      tournamentId: identity.tournamentId || undefined,
      playerId: identity.playerId || undefined,
      isAdmin: !!identity.isAdmin,
    };

    updateEntity('session', 'current', sessionData);

    return identity;
  } catch (e) {
    console.error('Sync session failed', e);
    return null;
  }
}

export async function syncActiveContext() {
  // Read session from entity store
  // Since this is async/startup, we can access the store directly or subscribe
  // Ideally `syncSession` has just populated it.

  // We can't use hooks here easily, but we can access the store via `useEntity` pattern if we are inside a component,
  // or just directly check the entity store if we export a getter.
  // BUT `useEntity` is a hook.
  // Let's import the store directly from `entities.ts` to read current state.
  const { entityStore } = await import('~/state/entities');
  const session = entityStore['session']?.['current'] as
    | SessionState
    | undefined;

  if (!session) return;

  const promises: Promise<any>[] = [];

  if (session.tournamentId) {
    promises.push(
      getTournamentById(session.tournamentId).then((t) => {
        updateEntity('tournament', t.id, {
          id: t.id,
          name: t.name,
          uuid: t.uuid,
          awardedHandicap: t.awardedHandicap,
          isMatchPlay: t.isMatchPlay,
        });
      }),
    );

    promises.push(
      getCourseDataByTournamentId(session.tournamentId).then((c) => {
        updateEntity('course', c.id, {
          id: c.id,
          name: c.name,
          holes: c.holes, // Already JSON/Array
          tees: c.tees,
          tournamentId: session.tournamentId!,
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
          displayName: t.displayName,
          tournamentId: t.tournamentId,
          started: t.started,
          finished: t.finished,
        });
      }),
    );

    promises.push(
      getTeamPlayersById(session.teamId).then((players) => {
        for (const p of players) {
          updateEntity('player', p.id, {
            id: p.id,
            name: p.name,
            handicap: p.handicap,
            teamId: p.teamId,
            tee: p.tee,
          });
        }
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
          uuid: t.uuid,
          awardedHandicap: t.awardedHandicap,
          isMatchPlay: t.isMatchPlay,
        });
      }
    }),
  );

  await Promise.allSettled(promises);
}
