import { createEffect, For, Suspense } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';

import { PLAYERS_QUERY_KEY } from '~/api/query_keys';
import { startTournament, fetchTeamPlayersById } from '~/api/teams';

import { Button } from '~/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '~/components/ui/table';
import { Form, FormError } from '~/components/form';
import { createForm } from '~/components/form/create_form';
import GolfLoader from '~/components/ui/golf_loader';

import { useTeam } from '~/hooks/useTeam';

export default function StartTournament() {
  const { form, handleSubmit } = createForm();

  const team = useTeam();
  const navigate = useNavigate();

  const teamPlayers = useQuery(() => ({
    queryKey: PLAYERS_QUERY_KEY,
    queryFn: () => fetchTeamPlayersById(team().id),
  }));

  const onSubmit = handleSubmit(async () => {
    if (!team().started) {
      await startTournament(team().id);
    }
    navigate(`/tournament/scorecard`, {
      replace: true,
    });
  });

  createEffect(() => {
    if (team().started) {
      navigate(`/tournament/scorecard`, {
        replace: true,
      });
    }
  });

  return (
    <Form form={form}>
      <form onsubmit={onSubmit}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px]">Name</TableHead>
              <TableHead>Handicap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Suspense fallback={<GolfLoader />}>
              <For each={teamPlayers.data}>
                {(player) => (
                  <TableRow>
                    <TableCell class="font-medium">{player.name}</TableCell>
                    <TableCell>{player.handicap}</TableCell>
                  </TableRow>
                )}
              </For>
            </Suspense>
          </TableBody>
        </Table>
        <div class=" my-2">
          <FormError />
          <div class="flex flex-grow justify-center my-2">
            <Button type="submit">Play</Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
