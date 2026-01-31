import { useEntities, useEntity } from './entities';

// Computed values
export const useTournamentRounds = () => {
  const session = useEntity('session', 'current');
  const rounds = useEntities('tournament_round');

  // const
  return {
    rounds,
    activeRoundId: () => session()?.roundId || null,
    activeRound: () => {
      const id = session()?.roundId;
      return id ? rounds().find((r) => r.id === id) : null;
    },
    currentRound: () => useEntity('tournament_round', 'current'),
    isMultiRound: () => rounds().length > 1,
    getRoundByNumber: (roundNumber: number) =>
      useEntity('tournament_round', roundNumber),
  };
};
