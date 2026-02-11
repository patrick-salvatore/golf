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
import CoursesPanel from './courses';
import AdminLogin from './login';
import { authenticateSession } from '~/lib/auth';
import authStore from '~/lib/auth';

const TournamentsPanel = () => {
  const [tab, setTab] = createSignal<string>('edit');

  return (
    <Tabs value={tab()} onChange={setTab}>
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
          <CreateTournamentForm onCreate={() => setTab('edit')} />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

const TeamsPanel = () => {
  return <ViewTournamentsTeams />;
};

type AdminTabs = 'tournament' | 'players' | 'teams' | 'courses' | 'invites';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  const [tab, setTab] = createSignal<AdminTabs>('tournament');

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
    <Show
      when={!checking()}
      fallback={<div class="flex justify-center p-10">Checking session...</div>}
    >
      <Show
        when={isAuthenticated()}
        fallback={<AdminLogin onLogin={() => setIsAuthenticated(true)} />}
      >
        <Tabs value={tab()} onChange={setTab}>
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
            <TabsTrigger class="z-5" value="courses">
              Courses
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
            <TabsContent value="courses">
              <CoursesPanel />
            </TabsContent>
          </Suspense>
        </Tabs>
      </Show>
    </Show>
  );
};

export default Admin;
