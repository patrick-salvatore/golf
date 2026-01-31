import type { TournamentRoundState } from '~/state/schema';
import { switchToRound } from '~/api/auth';
import authStore from './auth';

export interface RoundDetectionResult {
  currentRound: TournamentRoundState;
  shouldSwitch: boolean;
}

/**
 * Compares current session round with detected round
 */
export function shouldSwitchRound(
  currentRoundId: number | undefined,
  rounds: TournamentRoundState[],
): RoundDetectionResult | null {
  const detectedRound = rounds.find((r) => r.status === 'active');

  if (!detectedRound) {
    return null;
  }

  if (currentRoundId === detectedRound.id) {
    return {
      currentRound: detectedRound,
      shouldSwitch: false,
    };
  }

  return {
    currentRound: detectedRound,
    shouldSwitch: true,
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
  rounds: TournamentRoundState[],
): Promise<TournamentRoundState | null> {
  const result = shouldSwitchRound(currentRoundId, rounds);

  if (!result) {
    return null;
  }

  if (result.shouldSwitch) {
    await switchUserToRound(result.currentRound.id);
    return result.currentRound;
  }

  return result.currentRound;
}
