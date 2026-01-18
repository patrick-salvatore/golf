import { Route } from "@solidjs/router";
import { Suspense, createSignal } from "solid-js";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import CreateTournamentForm from "./create_tournament_form";
import UpdateTournaments from "./update_tournaments";
import ViewTournamentsTeams from "./view_tournament_teams";

const TournamentsPanel = () => {
  const [tab, setTab] = createSignal<string>();

  const handleTabChange = setTab;

  return (
    <Tabs value={tab() || "create"} onChange={handleTabChange}>
      <TabsList>
        <TabsTrigger class="z-5" value="edit">
          Edit
        </TabsTrigger>
        <TabsTrigger class="z-5" value="create">
          Create
        </TabsTrigger>
        <TabsIndicator variant="underline" />
      </TabsList>

      <Suspense>
        <TabsContent value="edit">
          <UpdateTournaments />
        </TabsContent>
        <TabsContent value="create">
          <CreateTournamentForm onCreate={() => handleTabChange("edit")} />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

const TeamsPanel = () => {
  const [tab, setTab] = createSignal<string>();

  const handleTabChange = setTab;

  return (
    <Tabs value={tab() || "create"} onChange={handleTabChange}>
      <TabsList>
        <TabsTrigger class="z-5" value="view">
          View
        </TabsTrigger>
        <TabsIndicator variant="underline" />
      </TabsList>

      <Suspense>
        <TabsContent value="view">
          <ViewTournamentsTeams />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

const AdminPanel = () => {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger class="z-5" value="tournament">
          Tournament
        </TabsTrigger>
        <TabsTrigger class="z-5" value="teams">
          Teams
        </TabsTrigger>
        <TabsIndicator variant="block" />
      </TabsList>

      <Suspense>
        <TabsContent value="tournament">
          <TournamentsPanel />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsPanel />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

export default () => {
  return <Route path="/_admin" component={() => <AdminPanel />} />;
};
