import { createSignal, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { LoadingButton } from '~/components/loading_button';
import { CopyButton } from '~/components/copy_to_clipboard';

import client from '~/api/client';
import { getTournaments } from '~/api/tournaments';

const InvitesPanel = () => {
  const [selectedTournament, setSelectedTournament] = createSignal('');
  const [generatedLink, setGeneratedLink] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const tournamentsQuery = useQuery(() => ({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
    initialData: [],
  }));

  const createInvite = async () => {
    if (!selectedTournament()) return;
    setLoading(true);
    try {
      const res = await client.post('/v1/invites', {
        tournamentId: selectedTournament(),
      });
      const token = res.data.token;
      const link = `${window.location.origin}/join?token=${token}`;
      setGeneratedLink(link);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg space-y-6">
      <h2 class="text-xl font-semibold">Create Tournament Invite</h2>
      <Show when={tournamentsQuery.data.length}>
        <div class="space-y-2">
          <label class="text-sm font-medium">Select Tournament</label>
          <Select
            value={selectedTournament()}
            onChange={setSelectedTournament}
            options={tournamentsQuery.data.map((t) => t.id)}
            placeholder="Select a tournament..."
            itemComponent={(props) => (
              <SelectItem item={props.item}>
                {
                  tournamentsQuery.data.find(
                    (t) => t.id === props.item.rawValue,
                  )?.name
                }
              </SelectItem>
            )}
          >
            <SelectTrigger>
              <SelectValue>
                {(state) =>
                  tournamentsQuery.data.find(
                    (t) => t.id === state.selectedOption(),
                  )?.name
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
        </div>

        <LoadingButton
          isLoading={() => loading()}
          disabled={!selectedTournament()}
          onClick={createInvite}
        >
          Generate Invite Link
        </LoadingButton>

        <Show when={generatedLink()}>
          <div class="p-4 bg-gray-50 border rounded-lg space-y-2">
            <label class="text-sm font-medium text-gray-500">Invite Link</label>
            <div class="flex items-center gap-2">
              <input
                readOnly
                class="flex-1 p-2 border rounded text-sm bg-white"
                value={generatedLink()}
              />
              <CopyButton text={generatedLink()} />
            </div>
            <p class="text-xs text-gray-500">
              Share this link with players. They can join the tournament and
              select their team.
            </p>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default InvitesPanel;
