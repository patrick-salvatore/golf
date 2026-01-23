import { createSignal, onMount, Show, For } from 'solid-js';
import { useSearchParams, useNavigate } from '@solidjs/router';

import { createPlayerSelection, getActivePlayers } from '~/api/player';

import { Button } from '~/components/ui/button';
import { TextField } from '~/components/ui/textfield';

import type { Player } from '~/lib/team';
import authStore from '~/lib/auth';
import { getInvite } from '~/api/invites';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invite, setInvite] = createSignal<any>(null);
  const [availablePlayers, setAvailablePlayers] = createSignal<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = createSignal<number>();

  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [step, setStep] = createSignal<'input' | 'invite' | 'select'>('invite');
  const [actionLoading, setActionLoading] = createSignal(false);
  const [inputToken, setInputToken] = createSignal('');

  onMount(async () => {
    const token = searchParams.token;
    if (!token) {
      setStep('input');
      setLoading(false);
      return;
    }

    if (Array.isArray(token)) {
      setError('Invalid invite token.');
      setStep('input');
      setLoading(false);
      return;
    }

    try {
      await loadInvite(token);
    } catch (e) {
      // If token is invalid, let user try another
      setError('Invalid or expired invite link.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  });

  const loadInvite = async (token: string) => {
    setLoading(true);
    try {
      const res = await getInvite(token);
      setInvite(res.data);
      setStep('invite');
      setError('');
    } catch (e) {
      setError('Invalid or expired invite link.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenSubmit = (e: Event) => {
    e.preventDefault();
    if (!inputToken()) return;
    loadInvite(inputToken());
  };

  const handleAcceptInvite = async () => {
    const token = searchParams.token || inputToken();
    if (!token || Array.isArray(token)) return;

    setActionLoading(true);
    try {
      const playersRes = await getActivePlayers(invite()?.tournamentId);
      console.log(playersRes)
      setAvailablePlayers(playersRes);
      setStep('select');
    } catch (e) {
      console.error(e);
      setError('Failed to join tournament. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPlayer = async () => {
    if (!selectedPlayer()) return;

    setActionLoading(true);
    try {
      const res = await createPlayerSelection({
        playerId: selectedPlayer(),
        tournamentId: invite()?.tournamentId,
        teamId: invite()?.teamId,
      });

      authStore.save(res.jid, res.rid);
      navigate('/tournament');
    } catch (e: any) {
      if (e.response?.status === 409) {
        setError('That player has already been selected by someone else.');
        // Refresh list
        const playersRes = await getActivePlayers(invite()?.tournamentId);
        setAvailablePlayers(playersRes);
      } else {
        console.error(e);
        setError('Failed to select player.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <Show
          when={!loading()}
          fallback={<div class="animate-pulse">Loading invite...</div>}
        >
          <h1 class="text-2xl font-bold mb-2">
            {step() === 'invite'
              ? "You're Invited!"
              : step() === 'select'
                ? 'Who are you?'
                : 'Join Tournament'}
          </h1>

          <Show when={step() === 'input'}>
            <p class="text-gray-600 mb-6">Enter your invite token to join.</p>
            <form onSubmit={handleManualTokenSubmit}>
              <TextField
                type="text"
                class="w-full mb-4 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Invite Token"
                value={inputToken()}
                onInput={(e) => setInputToken(e.currentTarget.value)}
              />
              <Button
                type="submit"
                class="w-full"
                disabled={!inputToken() || loading()}
              >
                {loading() ? 'Checking...' : 'Find Invite'}
              </Button>
            </form>
          </Show>

          <Show when={step() === 'invite'}>
            <p class="text-gray-600 mb-6">
              You have been invited to join the{' '}
              <strong>{invite()?.tournamentName}</strong> tournament.
            </p>

            <div class="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800">
              Tournament Date: {new Date().toLocaleDateString()}
            </div>

            <Button
              class="w-full"
              onClick={handleAcceptInvite}
              disabled={actionLoading()}
            >
              {actionLoading() ? 'Processing...' : 'Accept Invite'}
            </Button>
          </Show>

          <Show when={step() === 'select'}>
            <p class="text-gray-600 mb-6">
              Select your name from the list below to activate your scorecard.
            </p>

            <div class="mb-6 max-h-60 overflow-y-auto border rounded divide-y text-left">
              <For each={availablePlayers()}>
                {(player) => (
                  <div
                    class={`p-3 cursor-pointer hover:bg-blue-50 ${selectedPlayer() === player.id ? 'bg-blue-100 ring-1 ring-blue-500 inset-0 relative z-10' : ''}`}
                    onClick={() => setSelectedPlayer(player.id)}
                  >
                    <span class="font-medium">{player.name}</span>
                    <span class="text-xs text-gray-500 block">
                      Hcp: {player.handicap}
                    </span>
                  </div>
                )}
              </For>
              <Show when={availablePlayers().length === 0}>
                <div class="p-4 text-gray-500 text-center italic">
                  No available players found.
                </div>
              </Show>
            </div>

            <Button
              class="w-full"
              onClick={handleSelectPlayer}
              disabled={actionLoading() || !selectedPlayer()}
            >
              {actionLoading() ? 'Joining...' : 'Confirm Identity'}
            </Button>
          </Show>
        </Show>
      </div>
      <Show when={error()}>
        <div class="max-w-md min-w-md p-3 mt-4 text-center bg-red-50 text-red-700 border border-red-200 rounded">
          {error()}
        </div>
      </Show>
    </div>
  );
}
