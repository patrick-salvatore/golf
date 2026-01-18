import { Match, Show, Suspense, Switch } from "solid-js";
import { Route } from "@solidjs/router";

import { identity } from "~/state/helpers";
import { useTournamentStore } from "~/state/tournament";

import TournamentView from "~/components/tournament_view";
import MatchPlayLeaderboard from "~/components/leaderboard/match_play";
import TeamStrokePlayLeaderboard from "~/components/leaderboard/team_stroke_play";
import SnapContainer from "~/components/snap_container";
import SoloStrokePlayLeaderboard from "~/components/leaderboard/solo_stroke_play";

const TeamLeaderboards = (props) => {
  return (
    <Switch>
      <Match when={props.tournament().isMatchPlay}>
        <MatchPlayLeaderboard />
      </Match>
      <Match when={true}>
        <TeamStrokePlayLeaderboard />
      </Match>
    </Switch>
  );
};

export default () => {
  const tournament = useTournamentStore(identity);

  return (
    <Route
      path="leaderboard"
      component={() => (
        <Show when={tournament().id}>
          <TournamentView>
            <Suspense>
              <SnapContainer>
                <TeamLeaderboards tournament={tournament} />
                <SoloStrokePlayLeaderboard />
              </SnapContainer>
            </Suspense>
          </TournamentView>
        </Show>
      )}
    />
  );
};
