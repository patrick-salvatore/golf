import { createEffect, For, Suspense } from 'solid-js';
import { useNavigate } from '@solidjs/router';

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

import { identity } from '~/state/helpers';
import { startTournament } from '~/api/tournaments';

import { useTournamentStore } from '~/state/tournament';
import { useQuery } from '@tanstack/solid-query';
import { PLAYERS_QUERY_KEY } from '~/api/query_keys';
import { getTeamPlayersById } from '~/api/teams';
import { useTeam } from '~/hooks/useTeam';
import GolfLoader from '~/components/ui/golf_loader';
import { setGlobalLoadingSpinner } from '~/state/ui';

export default function StartTournament() {
  const { form, handleSubmit } = createForm();

  const navigate = useNavigate();
  const tournament = useTournamentStore(identity);
  const team = useTeam();

  const onSubmit = handleSubmit(async () => {
    if (!team().started) {
      await startTournament({
        teamId: team().id,
        tournamentId: tournament().id,
      });
    }
    navigate(`/tournament/scorecard`, {
      replace: true,
    });
  });

  const teamPlayers = useQuery(() => ({
    queryKey: PLAYERS_QUERY_KEY,
    queryFn: () => {
      setGlobalLoadingSpinner(true);
      return getTeamPlayersById(team().id).finally(() => {
        setGlobalLoadingSpinner(false);
      });
    },
  }));

  createEffect(() => {
    console.log(team());
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
