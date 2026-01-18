import { useLocation, useNavigate } from "@solidjs/router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createMemo, Show, Suspense, type ParentComponent } from "solid-js";
import { identity } from "~/state/helpers";
import { useSessionStore } from "~/state/session";

const TournamentView: ParentComponent = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSessionStore(identity);

  const currentTab = createMemo(() => {
    if (location.pathname.endsWith("scorecard")) return "scorecard";
    if (location.pathname.endsWith("leaderboard")) return "leaderboard";
    // if (location.pathname.endsWith("wagers")) return "wagers";
  });

  const handleTabChange = (value: string) => {
    navigate(`/tournament/${value}`);
  };

  return (
    <Show when={session()}>
      <Tabs value={currentTab()} onChange={handleTabChange}>
        <TabsList>
          <TabsTrigger class="z-5" value="scorecard">
            Score Card
          </TabsTrigger>
          <TabsTrigger class="z-5" value="leaderboard">
            Leaderboard
          </TabsTrigger>
          {/* <TabsTrigger class="z-5" value="wagers">
            Wagers
          </TabsTrigger> */}
        </TabsList>

        <Suspense>
          <TabsContent value="leaderboard">{props.children}</TabsContent>
          <TabsContent value="scorecard">{props.children}</TabsContent>
          {/* <TabsContent value="wagers">{props.children}</TabsContent> */}
        </Suspense>
      </Tabs>
    </Show>
  );
};

export default TournamentView;
