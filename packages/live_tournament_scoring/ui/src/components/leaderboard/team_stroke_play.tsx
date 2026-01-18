import { Minus, Plus, Table as TableIcon } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useQuery } from "@tanstack/solid-query";

import type { Leaderboard } from "~/lib/leaderboard";
import { getLeaderboard } from "~/api/leaderboard";
import { useSessionStore } from "~/state/session";
import { identity } from "~/state/helpers";
import { groupByIdMap, reduceToByIdMap } from "~/lib/utils";
import type { Hole } from "~/lib/hole";
import GolfScoreButton from "./golfscore";
import { cn } from "~/lib/cn";
import { useCourseStore } from "~/state/course";
import { toggleDisableSnapContainer } from "~/components/snap_container";
import { getTeamHoles } from "~/api/holes";
import { unwrap } from "solid-js/store";

export const getTeamHoleLeaderboardQueryKey = (id) => [
  "leaderboard",
  "holes",
  "team",
  id,
];

const LeaderboardScorecard = (props) => {
  const course = useCourseStore(identity);

  const holesQuery = useQuery<Hole[]>(() => ({
    queryKey: getTeamHoleLeaderboardQueryKey(props.teamId),
    queryFn: () => getTeamHoles(props.teamId),
    initialData: [],
  }));

  const courseHoles = createMemo(() => {
    return reduceToByIdMap(course().holes, "number");
  });

  const holesPerPlayer = createMemo(() => {
    if (holesQuery.error) {
      return {};
    }

    const scoresPerHole = holesQuery.data.reduce((acc, hole) => {
      if (!acc[hole.number]) {
        acc[hole.number] = {};
      }

      if (!acc[hole.number][hole.playerName]) {
        acc[hole.number][hole.playerName] = {
          ...hole,
          ...courseHoles()[hole.number],
        };
      }

      return acc;
    }, {});

    return scoresPerHole as Record<
      string,
      Record<string, Hole & { par: number; handicap: number }>
    >;
  });

  const holeNumbers = createMemo(() => {
    return Object.keys(holesPerPlayer()).sort((a, b) => +a - +b);
  });

  const players = createMemo(() => {
    const allPlayers = Object.values(holesPerPlayer()).flatMap((value) =>
      Object.keys(value)
    );

    return Array.from(new Set(allPlayers)) as any[];
  });

  return (
    <section class="bg-gray-50 max-w-[375px] relative border overflow-scroll no-scrollbar flex">
      <div class="flex flex-col h-full min-w-[80px] text-center font-medium text-sm sticky left-0 bg-white z-20 border-r">
        <div class="flex flex-col gap-1 bg-white text-center font-medium text-sm min-w-[60px] border-b">
          <div class="p-2">
            <span class="text-[10px] transform flex items-center">Hole</span>
            <span class="text-[10px] transform flex items-center">Par</span>
          </div>
        </div>
        <For each={players()}>
          {(playerName, i) => (
            <div
              class={cn(
                "grid grid-cols-2 justify-center items-center min-h-[82px] min-w-[80px] pl-2 gap-2",
                i() < players().length - 1 && "border-b"
              )}
            >
              <div class="flex min-w-[40px] text-xs">{playerName}</div>

              <div class="flex flex-col min-h-[81px] justify-end items-center gap-4 py-1">
                <span class="text-[10px] transform -rotate-90">gross</span>
                <span class="text-[10px] transform -rotate-90">net</span>
              </div>
            </div>
          )}
        </For>
      </div>
      <div>
        <div class="h-min grid grid-cols-[repeat(19,1fr)] bg-white">
          <For each={holeNumbers()}>
            {(holeNumber) => (
              <div class="flex flex-col gap-1 bg-white p-2 text-center font-medium text-sm min-w-[60px] border-b">
                <span class="text-xs">{holeNumber}</span>
                <span class="text-[10px]">
                  {courseHoles()[holeNumber]?.par}
                </span>
              </div>
            )}
          </For>
        </div>

        <div class="grid grid-cols-[repeat(18,1fr)]">
          <For each={players()}>
            {(playerName, i) => (
              <For each={holeNumbers()}>
                {(holeNumber) => {
                  const holeData = holesPerPlayer()[holeNumber][playerName];

                  const strokeHole = () => holeData.strokeHole;
                  const score = () => holeData.score;
                  const par = () => holeData.par;

                  return (
                    <div
                      class={cn(
                        "text-center text-sm min-w-[60px] gap-3",
                        i() < players().length - 1 && "border-b"
                      )}
                    >
                      <div class="flex justify-center items-center min-h-[10px] gap-1">
                        {strokeHole()
                          ? Array(strokeHole())
                              .fill(null)
                              .map(() => (
                                <div class="w-1 h-1 bg-red-500 rounded-full flex items-center justify-center"></div>
                              ))
                          : null}
                      </div>
                      <div class="font-medium min-h-[40px] flex justify-center items-center">
                        {score() && (
                          <GolfScoreButton score={+score()} par={par()} />
                        )}
                      </div>
                      <hr />
                      <div class="text-xs font-medium min-h-[30px] flex justify-center items-center">
                        {score() && strokeHole()
                          ? +score() - strokeHole()
                          : score()
                          ? +score()
                          : ""}
                      </div>
                    </div>
                  );
                }}
              </For>
            )}
          </For>
        </div>
      </div>
    </section>
  );
};

const TeamStrokePlayLeaderboard = () => {
  const [expandedRow, setExpandedRow] = createSignal<string>();
  const session = useSessionStore(identity);

  const leaderboardQuery = useQuery<Leaderboard>(() => ({
    queryKey: [session()?.tournamentId, "solo", "leaderboard"],
    queryFn: () => getLeaderboard({ tournamentId: session()?.tournamentId! }),
    initialData: [],
  }));

  const leaderboard = createMemo(() => {
    const unwrappedleaderboard = unwrap(leaderboardQuery.data);

    const notStarted = unwrappedleaderboard.filter((r) => !r.thru);
    const started = unwrappedleaderboard
      .filter((r) => r.thru)
      .sort((a, b) => (a.thru < b.thru ? 1 : -1));

    const groupByScore = groupByIdMap(started, "netScore");

    return {
      started: Object.entries(groupByScore).sort((a, b) => {
        return +a[0] > +b[0] ? 1 : -1;
      }),
      notStarted,
    };
  });

  const toggleRow = (id) => {
    if (expandedRow() === id) {
      toggleDisableSnapContainer(false);
    } else {
      toggleDisableSnapContainer(true);
    }

    setExpandedRow((prev) => (prev == id ? null : id));
  };

  return (
    <section class="min-w-[365px] max-w-[365px]">
      <h1 class="text-lg font-semibold capitalize">Teams</h1>
      <div class="h-min grid grid-cols-[50px_1fr_120px_1fr_1fr]">
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          {" "}
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          Pos.
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          Team
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground justify-end">
          Net
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground justify-end">
          Thru
        </span>
      </div>

      <For each={leaderboard().started}>
        {([, teams], position) => (
          <For each={teams}>
            {(row) => {
              const isTied = teams.length > 1;
              const pos = position() + 1;
              const netScore = row.netScore;

              return (
                <>
                  <div class="grid grid-cols-[50px_1fr_120px_1fr_1fr]">
                    <span class="text-sm p-2 align-middle font-medium w-auto px-0 items-center flex">
                      <button
                        onClick={() => toggleRow(row.id)}
                        class="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedRow() == row.id ? (
                          <Minus size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                        <TableIcon size={14} />
                      </button>
                    </span>
                    <span class="text-sm p-2 align-middle font-medium">
                      {isTied ? `T${pos}` : pos}
                    </span>

                    <span class="text-sm p-2 align-middle font-medium">
                      {row.teamName}
                    </span>

                    <span class="text-sm p-2 align-middle font-medium text-right">
                      {!netScore
                        ? "E"
                        : netScore < 0
                        ? netScore
                        : `+${netScore}`}
                    </span>
                    <span class="text-sm p-2 align-middle font-medium text-end">
                      {row.thru == 18 ? "F" : row.thru}
                    </span>
                  </div>

                  <Show when={expandedRow() == row.id}>
                    <LeaderboardScorecard teamId={row.id} />
                  </Show>
                </>
              );
            }}
          </For>
        )}
      </For>
      <For each={leaderboard().notStarted}>
        {(row) => (
          <div class="grid grid-cols-[50px_1fr_120px_1fr_1fr]">
            <span class="text-sm p-2 align-middle font-medium w-auto px-0 items-center flex"></span>
            <span class="text-sm p-2 align-middle font-medium">-</span>

            <span class="text-sm p-2 align-middle font-medium">
              {row.teamName}
            </span>

            <span class="text-sm p-2 align-middle font-medium text-right">
              E
            </span>
            <span class="text-sm p-2 align-middle font-medium text-end">-</span>
          </div>
        )}
      </For>
    </section>
  );
};

export default TeamStrokePlayLeaderboard;
