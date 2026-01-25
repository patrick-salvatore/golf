import { For } from 'solid-js';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/solid-query';

import { createForm } from '~/components/form/create_form';
import { Form, FormError } from '~/components/form';
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from '~/components/ui/textfield';
import { LoadingButton } from '~/components/loading_button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

import { createPlayer, fetchPlayers } from '~/api/player';

import type { Player } from '~/lib/team';

const CreatePlayerForm = () => {
  const queryClient = useQueryClient();

  const { form, register, handleSubmit, reset } = createForm({
    schema: z.object({
      name: z.string().min(1, 'Name is required'),
      handicap: z
        .string()
        .refine((val) => !isNaN(parseFloat(val)), 'Must be a number'),
      isAdmin: z.boolean().optional(),
    }),
    initialValues: {
      name: '',
      handicap: '0',
      isAdmin: false,
    },
  });

  const onSubmit = async (data) => {
    await createPlayer({
      name: data.name,
      handicap: parseFloat(data.handicap),
      isAdmin: !!data.isAdmin,
    });
    queryClient.invalidateQueries({ queryKey: ['players'] });
    reset();
  };

  return (
    <div class="p-4 bg-white rounded shadow mb-6">
      <h3 class="text-lg font-medium mb-4">Add New Player</h3>
      <Form form={form}>
        <form onSubmit={handleSubmit(onSubmit)} class="flex gap-4 items-end">
          <TextFieldRoot class="flex-1">
            <TextFieldLabel>Name</TextFieldLabel>
            <TextField {...register('name')} placeholder="Player Name" />
          </TextFieldRoot>

          <TextFieldRoot class="w-32">
            <TextFieldLabel>Handicap</TextFieldLabel>
            <TextField {...register('handicap')} type="number" step="0.1" />
          </TextFieldRoot>

          <div class="flex items-center pb-3 gap-2">
            <input
              type="checkbox"
              {...register('isAdmin')}
              id="is-admin"
              class="w-4 h-4"
            />
            <label for="is-admin" class="text-sm font-medium">
              Is Admin
            </label>
          </div>

          <LoadingButton isLoading={() => form.submitting} type="submit">
            Add Player
          </LoadingButton>
        </form>
        <FormError />
      </Form>
    </div>
  );
};

const PlayerList = () => {
  const playersQuery = useQuery<Player[]>(() => ({
    queryKey: ['players'],
    queryFn: fetchPlayers,
    initialData: [],
  }));

  return (
    <div class="bg-white rounded shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Handicap</TableHead>
            <TableHead>Admin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={playersQuery.data}>
            {(player) => (
              <TableRow>
                <TableCell class="font-medium">{player.name}</TableCell>
                <TableCell>{player.handicap}</TableCell>
                <TableCell>{(player as any).isAdmin ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </div>
  );
};

export default function PlayersPanel() {
  return (
    <div class="space-y-6">
      <CreatePlayerForm />
      <PlayerList />
    </div>
  );
}
