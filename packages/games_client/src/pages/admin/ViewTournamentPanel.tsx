import { createSignal, createMemo, For, Show, createEffect } from 'solid-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/solid-query';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '~/components/ui/table';
import { TextField } from '~/components/ui/textfield';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { fetchTournaments, fetchTeamsByTournament } from '~/api/tournaments';
import { fetchPlayersByTournament, updatePlayer } from '~/api/player';
import type { Player } from '~/lib/team';

interface PlayerFormState {
  name: string;
  handicap: string;
  active: boolean;
  teamId: number;
}

export function ViewTournamentPanel() {
  const [selectedTournamentId, setSelectedTournamentId] = createSignal<number | null>(null);
  const [editingPlayers, setEditingPlayers] = createSignal<Map<number, PlayerFormState>>(new Map());

  // Fetch tournaments for dropdown
  const tournamentsQuery = useQuery(() => ({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  }));

  // Fetch players for selected tournament
  const playersQuery = useQuery(() => ({
    queryKey: ['tournament-players', selectedTournamentId()],
    queryFn: () => fetchPlayersByTournament(selectedTournamentId()!),
    enabled: !!selectedTournamentId(),
  }));

  // Fetch teams for selected tournament
  const teamsQuery = useQuery(() => ({
    queryKey: ['tournament-teams', selectedTournamentId()],
    queryFn: () => fetchTeamsByTournament(selectedTournamentId()!),
    enabled: !!selectedTournamentId(),
  }));

  const queryClient = useQueryClient();

  // Mutation for updating player
  const updatePlayerMutation = useMutation(() => ({
    mutationFn: async (variables: { playerId: number; data: PlayerFormState }) => {
      return updatePlayer(variables.playerId, {
        name: variables.data.name,
        handicap: parseFloat(variables.data.handicap) || 0,
        active: variables.data.active,
        team_id: variables.data.teamId,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch players
      queryClient.invalidateQueries({ queryKey: ['tournament-players', selectedTournamentId()] });
    },
  }));

  // Initialize editing state when selected tournament changes
  createEffect(() => {
    if (playersQuery.data) {
      const newMap = new Map();
      playersQuery.data.forEach(player => {
        newMap.set(player.id, initializeEditingState(player));
      });
      setEditingPlayers(newMap);
    }
  });

  // Initialize editing state when players load
  const initializeEditingState = (player: Player): PlayerFormState => ({
    name: player.name,
    handicap: player.handicap?.toString() || '0',
    active: (player as any).Active ?? false,
    teamId: (player as any).TeamID || player.teamId,
  });

  // Update editing state for a player field
  const updatePlayerField = (playerId: number, field: keyof PlayerFormState, value: any) => {
    setEditingPlayers(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(playerId) || { name: '', handicap: '0', active: false, teamId: 0 };
      newMap.set(playerId, { ...current, [field]: value });
      return newMap;
    });
  };

  // Save player changes
  const handleSave = (playerId: number) => {
    const data = editingPlayers().get(playerId);
    if (data) {
      updatePlayerMutation.mutate({ playerId, data });
    }
  };

  // Get team name for display
  const getTeamName = (teamId: number) => {
    const team = teamsQuery.data?.find((t: any) => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <label class="text-sm font-medium">Select Tournament:</label>
        <Select
          value={selectedTournamentId()}
          onChange={(value) => setSelectedTournamentId(value)}
          options={tournamentsQuery.data?.map((t: any) => t.id) || []}
          itemComponent={(_props) => {
            const tournament = tournamentsQuery.data?.find((t: any) => t.id === _props.item.rawValue);
            return (
              <SelectItem item={_props.item}>
                {tournament?.name}
              </SelectItem>
            );
          }}
          placeholder="Choose a tournament..."
          class="w-80"
        >
          <SelectTrigger>
            <SelectValue>
              {(state: { selectedOption: () => number }) => {
                const tournament = tournamentsQuery.data?.find((t: any) => t.id === state.selectedOption());
                return tournament?.name || 'Choose a tournament...';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>

      <Show when={selectedTournamentId()}>
        <Show when={playersQuery.isLoading || teamsQuery.isLoading}>
          <div class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Show>

        <Show when={!playersQuery.isLoading && !teamsQuery.isLoading}>
          <Show when={playersQuery.data?.length === 0}>
            <div class="text-center py-8 text-muted-foreground">
              No players found for this tournament.
            </div>
          </Show>

          <Show when={playersQuery.data && playersQuery.data.length > 0}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[200px]">Name</TableHead>
                  <TableHead class="w-[100px]">Handicap</TableHead>
                  <TableHead class="w-[80px]">Active</TableHead>
                  <TableHead class="w-[150px]">Team</TableHead>
                  <TableHead class="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={playersQuery.data}>
                  {(player) => {
                    const editingState = createMemo(() => {
                      const state = editingPlayers().get(player.id);
                      if (state) return state;
                      return initializeEditingState(player);
                    });

                    return (
                      <TableRow>
                        <TableCell>
                          <TextField
                            type="text"
                            value={editingState().name}
                            onInput={(e) => updatePlayerField(player.id, 'name', e.currentTarget.value)}
                            class="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            step="0.1"
                            value={editingState().handicap}
                            onInput={(e) => updatePlayerField(player.id, 'handicap', e.currentTarget.value)}
                            class="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            id={`active-${player.id}`}
                            value={editingState().active}
                            onChange={(checked) => updatePlayerField(player.id, 'active', checked)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editingState().teamId}
                            onChange={(value) => updatePlayerField(player.id, 'teamId', value)}
                            options={teamsQuery.data?.map((t: any) => t.id) || []}
                            itemComponent={(_props) => (
                              <SelectItem item={_props.item}>
                                {getTeamName(_props.item.rawValue)}
                              </SelectItem>
                            )}
                            class="w-full"
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {(state: { selectedOption: () => number }) => {
                                  const teamId = state.selectedOption();
                                  return getTeamName(teamId);
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent />
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSave(player.id)}
                            disabled={updatePlayerMutation.isPending}
                          >
                            {updatePlayerMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }}
                </For>
              </TableBody>
            </Table>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
