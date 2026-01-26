import { createStore } from 'solid-js/store';
import { createEffect, createSignal, createResource } from 'solid-js';
import { useSessionStore } from './session';
import { fetchTournamentRounds } from '~/api/tournaments';
import type { TournamentRoundState } from './schema';

// Global state for tournament rounds
const [tournamentRounds, setTournamentRounds] = createStore<TournamentRoundState[]>([]);
const [activeRoundId, setActiveRoundId] = createSignal<number | null>(null);
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
      
      // Set active round to the first active/pending round, or first round if none active
      if (roundsData.length > 0) {
        const activeRound = roundsData.find(r => r.status === 'active') || 
                           roundsData.find(r => r.status === 'pending') ||
                           roundsData[0];
        setActiveRoundId(activeRound.id);
      }
      
      return roundsData;
    } finally {
      setIsLoadingRounds(false);
    }
  }
);

// Computed values
export const useTournamentRounds = () => ({
  rounds: () => tournamentRounds,
  activeRoundId,
  setActiveRoundId,
  isLoadingRounds,
  activeRound: () => {
    const id = activeRoundId();
    return id ? tournamentRounds.find(r => r.id === id) : null;
  },
  // Helper to determine if this is a multi-round tournament
  isMultiRound: () => tournamentRounds.length > 1,
  // Helper to get round by number
  getRoundByNumber: (roundNumber: number) => 
    tournamentRounds.find(r => r.roundNumber === roundNumber),
});

// Export individual functions for use in components
export { setActiveRoundId, isLoadingRounds };