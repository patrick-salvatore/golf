import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  type Component,
} from "solid-js";
import { ChevronLeft, ChevronRight } from "lucide-solid";
import { unwrap } from "solid-js/store";
import { useQueryClient, useQuery, useMutation } from "@tanstack/solid-query";

import { Bottomsheet } from "~/components/bottom_sheet";
import { Button } from "~/components/ui/button";

import { useCourseStore } from "~/state/course";
import { identity } from "~/state/helpers";
import { useSessionStore } from "~/state/session";

import { groupByIdMap, reduceToByIdMap } from "~/lib/utils";
import type { Score, Hole, UpdateHolePayload } from "~/lib/hole";

import { Route } from "@solidjs/router";
import { selectTeamPlayersMap, useTeamStore } from "~/state/team";
import { updateTeam } from "~/api/teams";
import { getTeamHoles, updateHoles } from "~/api/holes";
import type { PlayerId } from "~/lib/team";
import TournamentView from "~/components/tournament_view";
import { getTeamHoleLeaderboardQueryKey } from "~/components/leaderboard/team_stroke_play";

const FIRST_HOLE = 1;
const NUM_HOLES = 18;

interface GolfScoreButtonProps {
  score: number | string;
  par: number;
  onClick: () => void;
  class?: string;
}

const GolfScoreButton: Component<GolfScoreButtonProps> = (props) => {
  const diff = Number(props.score) - props.par;

  const scoreType = (() => {
    if (diff === -3) return "albatross";
    if (diff == -2) return "eagle";
    if (diff === -1) return "birdie";
    if (diff === 0) return "par";
    if (diff === 1) return "bogey";
    if (diff === 2) return "double-bogey";
    if (diff >= 3) return "triple-plus";
    return;
  })();

  const getButtonStyles = () => {
    const baseStyles =
      "text-2xl font-bold flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border-gray-600";

    switch (scoreType) {
      case "albatross":
        return `${baseStyles} rounded-full border-2`;

      case "eagle":
        return `${baseStyles} rounded-full border-2`;

      case "birdie":
        return `${baseStyles} rounded-full border-2`;

      case "bogey":
        return `${baseStyles} rounded-none border-2`;

      case "double-bogey":
        return `${baseStyles} rounded-none border-2`;

      case "triple-plus":
        return `${baseStyles} rounded-none border-2`;

      default:
        return baseStyles;
    }
  };

  const renderInnerBorders = () => {
    if (scoreType === "albatross") {
      return (
        <>
          <div class="absolute rounded-full inset-2 border-2 border-gray-600 pointer-events-none" />
          <div class="absolute rounded-full inset-4 border-1 border-gray-600 pointer-events-none" />
        </>
      );
    }
    if (scoreType === "eagle") {
      return (
        <div class="absolute rounded-full inset-2 border-2 border-gray-600 pointer-events-none" />
      );
    }
    if (scoreType === "double-bogey") {
      return (
        <div class="absolute inset-2 border-2 border-gray-600 pointer-events-none rounded-none" />
      );
    }
    if (scoreType === "triple-plus") {
      return (
        <>
          <div class="absolute inset-2 border-2 border-gray-600 pointer-events-none rounded-none" />
          <div class="absolute inset-4 border-2 border-gray-500 pointer-events-none rounded-none" />
        </>
      );
    }
    return null;
  };

  return props.par == 5 && props.score == 1 ? null : (
    <button
      class={`${getButtonStyles()} ${props.class || ""} relative`}
      onClick={props.onClick}
    >
      {renderInnerBorders()}

      <span class="relative z-10 px-6 py-4">{props.score}</span>

      <span class="absolute bottom-1 text-xs font-normal opacity-70">
        {scoreType === "par" ? "Par" : null}
      </span>
    </button>
  );
};

type ScoreData = {
  playerId: string;
  holeIndex: number;
} | null;

type UpdateScoreFn = (data: { playerId: string; score: Score }) => void;

export type HoleScores = Record<PlayerId, Hole>;

const ScoreCard = () => {
  const queryClient = useQueryClient();

  const session = useSessionStore(identity);
  const course = useCourseStore(identity);
  const team = useTeamStore(identity);

  const [showUnsavedModal, setShowUnsavedModal] = createSignal<number>();
  const [currentHoleNumber, setCurrentHoleNumber] = createSignal(FIRST_HOLE);

  const [openScorePanelData, setOpenScorePanelData] =
    createSignal<ScoreData>(null);

  const [currentHoleScoreData, setCurrentHoleScoreData] =
    createSignal<HoleScores>({});

  const queryKey = [team().id, "holes"];

  const holesQuery = useQuery(() => ({
    queryKey: queryKey,
    queryFn: () => getTeamHoles(session()?.teamId!),
    initialData: [],
  }));

  const handleSaveMutation = async (holes: UpdateHolePayload[]) => {
    return updateHoles(holes).then(() => {
      if (currentHoleNumber() === NUM_HOLES) {
        return updateTeam(team()?.id!, { finished: true });
      }
    });
  };

  const saveMutation = useMutation<any, any, UpdateHolePayload[], any>(() => ({
    mutationFn: handleSaveMutation,
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKey, context.newHoles);
    },
    onSettled: (_) => queryClient.invalidateQueries({ queryKey }),
  }));

  const teamPlayers = createMemo(() => selectTeamPlayersMap(team()));

  const holes = createMemo(() => groupByIdMap(holesQuery.data, "number"));

  const thruHole = createMemo(() => {
    const hole = Object.entries(holes()).find(([, hole]) =>
      unwrap(hole).find((hole) => !hole.score)
    );

    if (team().finished) {
      return NUM_HOLES;
    }

    if (hole) {
      return +hole[0];
    }

    return 1;
  });

  const courseHole = createMemo(
    () => course().holes?.[currentHoleNumber() - 1]
  );

  const hasUnsavedChanges = createMemo(() => {
    const originalHoles = holes()?.[currentHoleNumber()];
    const currentData = currentHoleScoreData();

    if (!originalHoles || !currentData) return false;

    return originalHoles.some((hole) => {
      const currentScore = currentData[hole.playerId]?.score;
      const originalScore = hole.score;
      return currentScore && originalScore !== currentScore;
    });
  });

  const canSave = createMemo(() => {
    const allPlayersHaveAScore = Object.values(currentHoleScoreData()).every(
      (hole) => hole.score
    );

    return allPlayersHaveAScore && hasUnsavedChanges();
  });

  createEffect(() => {
    setCurrentHoleNumber(thruHole());
  });

  createEffect(async () => {
    const playerHoles = holes()[currentHoleNumber()];

    if (playerHoles) {
      setCurrentHoleScoreData(reduceToByIdMap(playerHoles, "playerId"));
    }
  });

  const goToPreviousHole = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedModal(-1);
      return;
    }

    if (courseHole().number > FIRST_HOLE) {
      setCurrentHoleNumber(currentHoleNumber() - 1);
    }
  };

  const goToNextHole = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedModal(1);
      return;
    }
    if (currentHoleNumber() < NUM_HOLES) {
      setCurrentHoleNumber(currentHoleNumber() + 1);
    }
  };

  const confirmGoToNextHole = (direction: number) => {
    setShowUnsavedModal();
    const next = NUM_HOLES + direction;
    if (FIRST_HOLE < next || next > NUM_HOLES) {
      setCurrentHoleNumber(currentHoleNumber() + direction);
    }
  };

  const cancelGoToNextHole = () => {
    setShowUnsavedModal();
  };

  const updateScore: UpdateScoreFn = ({ playerId, score }) => {
    setCurrentHoleScoreData((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], score: score },
    }));
    setOpenScorePanelData(null);
  };

  const openScorePad = (playerId: string, strokeHole: number) => {
    setOpenScorePanelData({
      playerId,
      strokeHole,
      holeIndex: currentHoleNumber(),
    });
  };

  const handleSave = () => {
    const payload = Object.values(currentHoleScoreData() || {})
      .map((data) => {
        if (!data.id) return null;
        return { id: data.id, score: data.score } as UpdateHolePayload;
      })
      .filter(Boolean) as UpdateHolePayload[];

    queryClient.invalidateQueries({
      queryKey: getTeamHoleLeaderboardQueryKey(team().id),
    });

    saveMutation?.mutate(payload);
  };

  return (
    <>
      <div class=" bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousHole}
            disabled={courseHole().number === FIRST_HOLE}
            class="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div class="text-center">
            <Show when={courseHole()}>
              <h2 class="text-2xl font-bold text-gray-800">
                Hole {courseHole().number}
              </h2>
            </Show>

            <div class="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <span>Par {courseHole()?.par}</span>
              <span>•</span>
              <span>Index {courseHole()?.handicap}</span>
            </div>
          </div>

          <button
            onClick={goToNextHole}
            disabled={courseHole().number === NUM_HOLES}
            class="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div class="mb-6">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Hole 1</span>
            <span>Hole {NUM_HOLES}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(courseHole().number / NUM_HOLES) * 100}%`,
              }}
            />
          </div>
        </div>

        <div class="mb-4 rounded-lg">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
              <span>Stroke hole</span>
            </div>
          </div>
        </div>

        <Show when={holes()}>
          <div class="space-y-4">
            <For each={Object.entries(currentHoleScoreData())}>
              {([playerId, hole]) => {
                const player = teamPlayers()?.[playerId];

                return (
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-2 relative">
                      <h3 class="font-semibold text-gray-800">{player.name}</h3>
                      <Show when={hole.strokeHole}>
                        <div
                          class={`flex space-x-1 items-center align-top relative -top-1`}
                        >
                          {Array(hole.strokeHole)
                            .fill(null)
                            .map(() => (
                              <div class="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            ))}
                        </div>
                      </Show>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => openScorePad(player.id, hole.strokeHole)}
                        disabled={saveMutation?.isPending}
                        class={`w-16 h-12 text-lg font-bold border-2 rounded-md transition-colors flex items-center justify-center border-gray-300  ${
                          saveMutation?.isPending
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Show
                          when={hole?.score}
                          fallback={<span class="text-gray-400">—</span>}
                        >
                          {hole?.score}
                        </Show>
                      </Button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          <div class="mt-6 flex space-x-3">
            <Show when={!team().finished}>
              <Button
                onClick={handleSave}
                disabled={
                  !canSave() || !hasUnsavedChanges() || saveMutation?.isPending
                }
                class="flex-1 bg-green-600  disabled:bg-green-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Show when={saveMutation?.isPending} fallback="Save Hole">
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                </Show>
              </Button>
            </Show>
          </div>
        </Show>
      </div>

      <Show when={openScorePanelData() && !team().finished}>
        <Bottomsheet
          variant="snap"
          defaultSnapPoint={({ maxHeight }) => maxHeight / 2 + 75}
          snapPoints={({ maxHeight }) => [maxHeight / 2 + 75]}
          onClose={() => setOpenScorePanelData(null)}
        >
          <div class="mt-6 px-4">
            <div class="grid grid-cols-3 justify-center">
              <For each={["1", "2", "3", "4", "5", "6", "7", "8", "X"]}>
                {(score, index) => {
                  const row = Math.floor(index() / 3);
                  const col = index() % 3;

                  let gridBorders = "flex justify-center p-4";
                  if (col < 2) gridBorders += " border-r-2 border-gray-400";
                  if (row < 2) gridBorders += " border-b-2 border-gray-400";

                  return (
                    <div class={gridBorders}>
                      <GolfScoreButton
                        score={score}
                        par={courseHole()?.par}
                        onClick={() => {
                          updateScore({
                            playerId: openScorePanelData()!.playerId,
                            score,
                          });
                        }}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Bottomsheet>
      </Show>

      <Show when={showUnsavedModal() !== undefined}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">
              Unsaved Changes
            </h3>
            <p class="text-gray-600 mb-6">
              You have unsaved changes on this hole. Are you sure you want to
              continue to the next hole? Your changes will be lost.
            </p>
            <div class="flex space-x-3">
              <Button
                onClick={cancelGoToNextHole}
                class="flex-1 bg-gray-200  text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmGoToNextHole(showUnsavedModal()!)}
                class="flex-1 bg-green-600  text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default () => {
  const team = useTeamStore(identity);

  return (
    <Route
      path="/scorecard"
      component={() => (
        <Show when={team().id}>
          <TournamentView>
            <ScoreCard />
          </TournamentView>
        </Show>
      )}
    />
  );
};
