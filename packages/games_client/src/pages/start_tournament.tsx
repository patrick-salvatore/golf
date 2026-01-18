import z from "zod";
import { createEffect, createMemo, For } from "solid-js";
import { Route, useNavigate } from "@solidjs/router";

import { Button } from "~/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/components/ui/table";
import { Form, FormError } from "~/components/form";

import { identity } from "~/state/helpers";
import { useTeamStore } from "~/state/team";
import { startTournament } from "~/api/tournaments";
import { useTournamentStore } from "~/state/tournament";
import { createForm } from "~/components/form/create_form";

function Tournament() {
  const navigate = useNavigate();
  const team = useTeamStore(identity);
  const tournament = useTournamentStore(identity);

  const { form, handleSubmit } = createForm();

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
            <For each={team().players}>
              {(player) => (
                <TableRow>
                  <TableCell class="font-medium">{player.name}</TableCell>
                  <TableCell>{player.handicap}</TableCell>
                </TableRow>
              )}
            </For>
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

export default () => {
  return <Route path="start" component={Tournament} />;
};
