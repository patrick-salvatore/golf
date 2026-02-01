import { createSignal, Show, For, type ParentComponent } from 'solid-js';
import { LoadingButton } from '~/components/loading_button';
import {
  TextField,
  TextFieldRoot,
} from '~/components/ui/textfield';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { fetchInvite } from '~/api/invites';
import { fetchActivePlayers, createPlayerSelection } from '~/api/player';
import authStore from '~/lib/auth';
import type { AvailablePlayer } from '~/lib/team';

const UserAuthForm: ParentComponent<{ onLogin: () => void }> = (props) => {
  const [step, setStep] = createSignal(1);
  const [inviteToken, setInviteToken] = createSignal('');
  const [players, setPlayers] = createSignal<AvailablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = createSignal<AvailablePlayer | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [tournamentId, setTournamentId] = createSignal<number | null>(null);

  const handleStep1 = async (e: Event) => {
    e.preventDefault();
    if (!inviteToken()) return;
    
    setLoading(true);
    setError('');
    try {
      const inviteRes = await fetchInvite(inviteToken());
      const tId = inviteRes.data.tournamentId;
      setTournamentId(tId);

      const activePlayers = await fetchActivePlayers(tId);
      setPlayers(activePlayers);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError('Invalid token or network error');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: Event) => {
    e.preventDefault();
    const player = selectedPlayer();
    const tId = tournamentId();
    if (!player || !tId) return;

    setLoading(true);
    setError('');
    try {
      const res = await createPlayerSelection({
         playerId: player.playerId,
         tournamentId: tId,
         teamId: player.teamId,
         inviteToken: inviteToken()
      });
      authStore.save(res.jid, res.rid);
      props.onLogin();
    } catch (err) {
      console.error(err);
      setError('Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="grid gap-6">
      <Show when={step() === 1}>
        <form onSubmit={handleStep1}>
          <div class="grid gap-2">
            <div class="grid gap-1">
              <TextFieldRoot>
                <TextField
                  id="inviteToken"
                  value={inviteToken()}
                  onInput={(e) => setInviteToken(e.currentTarget.value)}
                  placeholder="Invite Token"
                  type="text"
                  autoCapitalize="none"
                  autocorrect="off"
                  disabled={loading()}
                />
              </TextFieldRoot>
            </div>
            <LoadingButton isLoading={loading} type="submit">
              Next
            </LoadingButton>
          </div>
        </form>
      </Show>

      <Show when={step() === 2}>
        <form onSubmit={handleStep2}>
          <div class="grid gap-2">
            <div class="grid gap-1">
              <Select
                value={selectedPlayer()}
                onChange={(val) => setSelectedPlayer(val)}
                options={players()}
                placeholder="Select Your Player"
                itemComponent={(props) => (
                  <SelectItem item={props.item}>
                    {props.item.rawValue.name}
                  </SelectItem>
                )}
              >
                <SelectTrigger>
                  <SelectValue<AvailablePlayer>>
                    {(state) => state.selectedOption()?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <LoadingButton isLoading={loading} type="submit" disabled={!selectedPlayer()}>
              Login
            </LoadingButton>
          </div>
        </form>
      </Show>

      <Show when={error()}>
        <div class="text-sm font-medium text-destructive text-center">
          {error()}
        </div>
      </Show>
    </div>
  );
};

export default UserAuthForm;
