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
import { toggleDisableSnapContainer } from "../snap_container";
import { getPlayerHoles } from "~/api/holes";
import { unwrap } from "solid-js/store";

const LeaderboardScorecard = (props) => {
  const course = useCourseStore(identity);

  const holesQuery = useQuery<Hole[]>(() => ({
    queryKey: ["leaderboard", "holes", "player", props.playerId],
    queryFn: () => getPlayerHoles(props.playerId),
    initialData: [],
  }));

  const courseHoles = createMemo(() => {
    return reduceToByIdMap(course().holes, "number");
  });

  const holesPerPlayer = createMemo(() => {
    return holesQuery.data.map((hole) => ({
      ...hole,
      ...courseHoles()[hole.number],
    }));
  });

  const player = createMemo(() => {
    if (!holesPerPlayer().length) return "";

    return holesPerPlayer()[0].playerName;
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
        <div
          class={cn(
            "grid grid-cols-2 justify-center items-center min-h-[82px] min-w-[80px] pl-2 gap-2"
          )}
        >
          <div class="flex min-w-[40px] text-xs">{player()}</div>

          <div class="flex flex-col min-h-[81px] justify-end items-center gap-4 py-1">
            <span class="text-[10px] transform -rotate-90">gross</span>
            <span class="text-[10px] transform -rotate-90">net</span>
          </div>
        </div>
      </div>
      <div>
        <div class="h-min grid grid-cols-[repeat(19,1fr)] bg-white">
          <For each={holesPerPlayer()}>
            {(hole) => (
              <div class="flex flex-col gap-1 bg-white p-2 text-center font-medium text-sm min-w-[60px] border-b">
                <span class="text-xs">{hole.number}</span>
                <span class="text-[10px]">
                  {courseHoles()[hole.number]?.par}
                </span>
              </div>
            )}
          </For>
        </div>

        <div class="grid grid-cols-[repeat(18,1fr)]">
          <For each={holesPerPlayer()}>
            {(hole) => {
              return (
                <div class={cn("text-center text-sm min-w-[60px] gap-3")}>
                  <div class="flex justify-center items-center min-h-[10px] gap-1">
                    {hole.strokeHole
                      ? Array(hole.strokeHole)
                          .fill(null)
                          .map(() => (
                            <div class="w-1 h-1 bg-red-500 rounded-full flex items-center justify-center"></div>
                          ))
                      : null}
                  </div>
                  <div class="font-medium min-h-[40px] flex justify-center items-center">
                    {hole.score && (
                      <GolfScoreButton score={+hole.score} par={hole.par} />
                    )}
                  </div>
                  <hr />
                  <div class="text-xs font-medium min-h-[30px] flex justify-center items-center">
                    {hole.score && hole.strokeHole
                      ? +hole.score - hole.strokeHole
                      : hole.score
                      ? +hole.score
                      : ""}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </section>
  );
};

const NOT_STARTED = "not_started";

const SoloStrokePlayLeaderboard = () => {
  const [expandedRow, setExpandedRow] = createSignal<string>();
  const session = useSessionStore(identity);
  const course = useCourseStore(identity);

  const leaderboardQuery = useQuery<Leaderboard>(() => ({
    queryKey: [session()?.tournamentId, "individual", "leaderboard"],
    queryFn: () =>
      getLeaderboard({
        tournamentId: session()?.tournamentId!,
        individuals: true,
      }),
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
      <div class="h-min grid grid-cols-[50px_1fr_120px_1fr_1fr_1fr]">
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          {" "}
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          Pos.
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
          Player
        </span>
        <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground justify-end">
          Gross
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
              const netScore = !row.netScore
                ? "E"
                : row.netScore < 0
                ? row.netScore
                : `+${row.netScore}`;
              const grossScore = !row.grossScore
                ? "E"
                : row.grossScore < 0
                ? row.grossScore
                : `+${row.grossScore}`;

              const finalGross = row.grossScore
                ? row.coursePar + row.grossScore
                : 0;

              const finalNet = row.netScore ? row.coursePar + row.netScore : 0;

              return (
                <>
                  <div class="grid grid-cols-[50px_1fr_120px_1fr_1fr_1fr]">
                    <span class="text-sm p-2 align-middle font-medium w-auto px-0 items-center flex">
                      <button
                        onClick={() => toggleRow(row.id)}
                        class="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedRow() === row.id ? (
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
                      {row.thru == 18 ? finalGross : grossScore}
                    </span>

                    <span class="text-sm p-2 align-middle font-medium text-right">
                      {row.thru == 18 ? finalNet : netScore}
                    </span>
                    <span class="text-sm p-2 align-middle font-medium text-end">
                      {row.thru == 18 ? "F" : row.thru}
                    </span>
                  </div>

                  <Show when={expandedRow() === row.id}>
                    <LeaderboardScorecard playerId={row.id} />
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

export default SoloStrokePlayLeaderboard;
