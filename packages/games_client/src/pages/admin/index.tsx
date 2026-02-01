import { Suspense, createSignal, onMount, Show } from 'solid-js';

import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs';

import CreateTournamentForm from './create_tournament_form';
import UpdateTournaments from './update_tournaments';
import ViewTournamentsTeams from './view_tournament_teams';
import PlayersPanel from './players';
import InvitesPanel from './invites';
import UserAuthForm from './auth_form';
import { authenticateSession } from '~/lib/auth'; // Using lib/auth as requested in prompt "Actually, ~/lib/auth has authenticateSession."
import authStore from '~/lib/auth';

const TournamentsPanel = () => {
  const [tab, setTab] = createSignal<string>();

  const handleTabChange = setTab;

  return (
    <Tabs value={tab() || 'create'} onChange={handleTabChange}>
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
          <CreateTournamentForm onCreate={() => handleTabChange('edit')} />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

const TeamsPanel = () => {
  const [tab, setTab] = createSignal<string>();

  const handleTabChange = setTab;

  return (
    <Tabs value={tab() || 'create'} onChange={handleTabChange}>
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

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [checking, setChecking] = createSignal(true);

  onMount(async () => {
    if (!authStore.token) {
      setChecking(false);
      return;
    }

    try {
      const session = await authenticateSession();
      if (session?.isAdmin) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  });

  return (
    <Show when={!checking()} fallback={<div class="flex justify-center p-10">Checking session...</div>}>
      <Show when={isAuthenticated()} fallback={<UserAuthForm onLogin={() => setIsAuthenticated(true)} />}>
        <Tabs>
          <TabsList>
            <TabsTrigger class="z-5" value="tournament">
              Tournament
            </TabsTrigger>
            <TabsTrigger class="z-5" value="players">
              Players
            </TabsTrigger>
            <TabsTrigger class="z-5" value="teams">
              Teams
            </TabsTrigger>
            <TabsTrigger class="z-5" value="invites">
              Invites
            </TabsTrigger>
            <TabsIndicator variant="block" />
          </TabsList>

          <Suspense>
            <TabsContent value="tournament">
              <TournamentsPanel />
            </TabsContent>
            <TabsContent value="players">
              <PlayersPanel />
            </TabsContent>
            <TabsContent value="teams">
              <TeamsPanel />
            </TabsContent>
            <TabsContent value="invites">
              <InvitesPanel />
            </TabsContent>
          </Suspense>
        </Tabs>
      </Show>
    </Show>
  );
};

export default Admin;
