import { useQuery } from "@tanstack/solid-query";
import { createEffect, createSignal, For } from "solid-js";
import { getTournaments } from "~/api/tournaments";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/components/ui/table";
import type { Tournament } from "~/lib/tournaments";

const TOURNAMENTS_QUERY_KEY = ["tournaments"];

import { Match, Switch } from "solid-js";
import { Eye } from "lucide-solid";

import { Button } from "~/components/ui/button";

import type { Team } from "~/lib/team";
import { getTeamByTournamentId } from "~/api/teams";
import { CopyButton } from "~/components/copy_to_clipboard";

const ViewTeamForm = (props) => {
  const teams = useQuery<Team[]>(() => ({
    queryKey: ["teams", "tournament_id", props.viewingTournament().id],
    queryFn: () => getTeamByTournamentId(props.viewingTournament().id),
    initialData: [],
  }));

  createEffect(() => {
    console.log(teams.data);
  });
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-lg font-semibold capitalize">
        {props.viewingTournament().name}
      </h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={teams.data}>
            {(team) => {
              return (
                <TableRow>
                  <TableCell class="font-medium">
                    <CopyButton variant="ghost" text={team.id}>
                      {team.id}
                    </CopyButton>
                  </TableCell>
                  <TableCell class="font-medium">{team.name}</TableCell>
                </TableRow>
              );
            }}
          </For>
        </TableBody>
      </Table>
    </div>
  );
};

const ViewTournamentsTeams = () => {
  const [viewingTournament, setViewingTournament] = createSignal();

  const tournamentsQuery = useQuery<Tournament[]>(() => ({
    queryKey: TOURNAMENTS_QUERY_KEY,
    queryFn: getTournaments,
    initialData: [],
  }));

  return (
    <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <Switch>
        <Match when={viewingTournament()}>
          <ViewTeamForm
            viewingTournament={viewingTournament}
            onClose={() => setViewingTournament(undefined)}
          />
        </Match>

        <Match when={true}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={tournamentsQuery.data}>
                {(tournament) => {
                  return (
                    <TableRow>
                      <TableCell class="font-medium">
                        {tournament.name}
                      </TableCell>
                      <TableCell class="font-medium">
                        <Button
                          variant="ghost"
                          onClick={() => setViewingTournament(tournament)}
                          class="p-1 text-blue-600 hover:bg-red-100 rounded"
                          title="Remove from selection"
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </For>
            </TableBody>
          </Table>
        </Match>
      </Switch>
    </div>
  );
};

export default ViewTournamentsTeams;
