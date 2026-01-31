import { createMemo } from 'solid-js';
import { useEntity, useEntityById } from '~/state/entities';

export const useTeam = () => {
  const session = useEntity('session', 'current');
  const getTeamById = useEntityById('team');

  return createMemo(() => session() && getTeamById(session().teamId));
};
