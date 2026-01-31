import type { TournamentRoundState } from '~/state/schema';
import { switchToRound } from '~/api/auth';
import authStore from './auth';

export interface RoundDetectionResult {
  currentRound: TournamentRoundState;
  shouldSwitch: boolean;
  reason: string;
}

/**
 * Determines which round should be active based on current date and round statuses
 */
export function detectCurrentRound(rounds: TournamentRoundState[]): TournamentRoundState | null {
  if (!rounds.length) return null;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Priority 1: Today's active round
  for (const round of rounds) {
    if (round.roundDate === today && round.status === 'active') {
      return round;
    }
  }
  
  // Priority 2: Today's pending round
  for (const round of rounds) {
    if (round.roundDate === today && round.status === 'pending') {
      return round;
    }
  }
  
  // Priority 3: Next upcoming round
  for (const round of rounds) {
    if (round.roundDate >= today && round.status === 'pending') {
      return round;
    }
  }
  
  // Priority 4: Any currently active round
  for (const round of rounds) {
    if (round.status === 'active') {
      return round;
    }
  }
  
  // Priority 5: Fallback to first round
  return rounds[0];
}

/**
 * Compares current session round with detected round
 */
export function shouldSwitchRound(currentRoundId: number | undefined, rounds: TournamentRoundState[]): RoundDetectionResult | null {
  const detectedRound = detectCurrentRound(rounds);
  
  if (!detectedRound) {
    return null;
  }
  
  if (currentRoundId === detectedRound.id) {
    return {
      currentRound: detectedRound,
      shouldSwitch: false,
      reason: 'Already in correct round'
    };
  }
  
  const today = new Date().toISOString().split('T')[0];
  let reason = '';
  
  if (detectedRound.roundDate === today && detectedRound.status === 'active') {
    reason = `Today's round (${detectedRound.name}) is active`;
  } else if (detectedRound.roundDate === today && detectedRound.status === 'pending') {
    reason = `Today's round (${detectedRound.name}) is scheduled`;
  } else if (detectedRound.status === 'active') {
    reason = `Round ${detectedRound.roundNumber} is currently active`;
  } else {
    reason = `Defaulting to ${detectedRound.name}`;
  }
  
  return {
    currentRound: detectedRound,
    shouldSwitch: true,
    reason
  };
}

/**
 * Switches user session to the specified round by calling the backend API
 */
export async function switchUserToRound(roundId: number): Promise<void> {
  try {
    const tokens = await switchToRound(roundId);
    
    // Update stored tokens
    authStore.save(tokens.jid, tokens.rid);
    
    // The session will be updated on the next API call when the new token is used
    console.log(`🔄 Switched to round ${roundId}`);
  } catch (error) {
    console.error('Failed to switch round:', error);
    throw error;
  }
}

/**
 * Main function to handle automatic round detection and switching
 */
export async function autoDetectAndSwitchRound(
  currentRoundId: number | undefined,
  rounds: TournamentRoundState[]
): Promise<TournamentRoundState | null> {
  const result = shouldSwitchRound(currentRoundId, rounds);
  
  if (!result) {
    return null;
  }
  
  if (result.shouldSwitch) {
    console.log(`🎯 Auto-switching round: ${result.reason}`);
    await switchUserToRound(result.currentRound.id);
    return result.currentRound;
  }
  
  return result.currentRound;
}