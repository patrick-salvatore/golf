import { createMemo } from 'solid-js';
import { useEntities } from '~/state/entities';
import type { Hole } from '~/lib/hole';

export const useTournamentHoles = () => {
  const holes = useEntities<Hole>('hole_score');
  return holes;
};

export const useTeamHoles = (teamId: string | undefined) => {
  const allHoles = useTournamentHoles();

  return createMemo(() => {
    if (!teamId) return [];
    return allHoles().filter((h) => h.teamId === teamId);
  });
};
