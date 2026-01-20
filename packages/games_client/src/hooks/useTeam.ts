import { createMemo } from 'solid-js';
import { useEntityById } from '~/state/entities';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';

export const useTeam = () => {
  const session = useSessionStore(identity);
  const getTeamById = useEntityById('team');

  return createMemo(() => session() && getTeamById(session().teamId));
};
