import { createStore } from 'solid-js/store';
import { createSignal, createResource } from 'solid-js';
import { useSessionStore } from './session';
import { fetchTournamentRounds } from '~/api/tournaments';
import { detectCurrentRound } from '~/lib/round_detection';
import type { TournamentRoundState } from './schema';

// Global state for tournament rounds
const [tournamentRounds, setTournamentRounds] = createStore<TournamentRoundState[]>([]);
const [isLoadingRounds, setIsLoadingRounds] = createSignal(false);

// Helper to get current tournament ID from session
function getTournamentId() {
  const session = useSessionStore((s) => s?.tournamentId);
  return session();
}

// Resource to fetch tournament rounds
export const [rounds] = createResource(
  getTournamentId,
  async (tournamentId) => {
    if (!tournamentId) return [];
    
    setIsLoadingRounds(true);
    try {
      const roundsData = await fetchTournamentRounds(tournamentId);
      setTournamentRounds(roundsData);
      return roundsData;
    } finally {
      setIsLoadingRounds(false);
    }
  }
);

// Computed values
export const useTournamentRounds = () => {
  const session = useSessionStore(identity);
  
  return {
    rounds: () => tournamentRounds,
    isLoadingRounds,
    activeRoundId: () => session()?.roundId || null,
    activeRound: () => {
      const id = session()?.roundId;
      return id ? tournamentRounds.find(r => r.id === id) : null;
    },
    currentRound: () => detectCurrentRound(tournamentRounds),
    isMultiRound: () => tournamentRounds.length > 1,
    getRoundByNumber: (roundNumber: number) => 
      tournamentRounds.find(r => r.roundNumber === roundNumber),
  };
};

// Import identity helper
import { identity } from './helpers';