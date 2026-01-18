import {
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Table as TableIcon,
} from "lucide-solid";
import { unwrap } from "solid-js/store";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useQuery } from "@tanstack/solid-query";

import { useSessionStore } from "~/state/session";
import { identity } from "~/state/helpers";
import type { Hole } from "~/lib/hole";

import GolfScoreButton from "./golfscore";
import { cn } from "~/lib/cn";
import { useCourseStore } from "~/state/course";
import { reduceToByIdMap } from "~/lib/utils";
import { toggleDisableSnapContainer } from "~/components/snap_container";
import { getTournamentHoles } from "~/api/holes";

const Scorecard = (props) => {
  const holeNumbers = createMemo(() => {
    return Object.keys(props.teamData()).sort((a, b) => +a - +b);
  });

  const players = createMemo(() => {
    const allPlayers = new Set();
    Object.values(props.teamData()).forEach((hole) => {
      Object.values(hole).forEach((player) => {
        allPlayers.add(player.playerName);
      });
    });

    return Array.from(allPlayers) as any[];
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

              <div class="flex flex-col min-h-[81px] justify-around items-center">
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
                  {props.courseHoles()[holeNumber]?.par}
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
                  const holeData = () =>
                    props.teamData()[holeNumber][playerName];
                  const strokeHole = () => holeData().strokeHole;
                  const score = () => holeData().score;
                  const par = () => holeData().par;

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

const MatchPlayLeaderboard = () => {
  const session = useSessionStore(identity);
  const [expandedRow, setExpandedRow] = createSignal({});
  const course = useCourseStore(identity);

  const holesQuery = useQuery<Hole[]>(() => ({
    queryKey: ["leaderboard", "holes", "matchplay"],
    queryFn: () => getTournamentHoles(session()?.tournamentId!),
    initialData: [],
  }));

  const courseHoles = createMemo(() => {
    return reduceToByIdMap(course().holes, "number");
  });

  const holesPerTeam = createMemo(() => {
    if (holesQuery.error) {
      return {};
    }

    const scoresPerHole = holesQuery.data.reduce((acc, hole) => {
      if (!acc[hole.teamId]) {
        acc[hole.teamId] = {};
      }

      if (!acc[hole.teamId][hole.number]) {
        acc[hole.teamId][hole.number] = {};
      }

      if (!acc[hole.teamId][hole.number][hole.playerName]) {
        acc[hole.teamId][hole.number][hole.playerName] = {
          ...hole,
          ...courseHoles()[hole.number],
        };
      }

      return acc;
    }, {});

    return scoresPerHole;
  });

  const leaderboard = createMemo(() => {
    if (holesQuery.error) {
      return;
    }

    if (!holesQuery.data.length) return {};

    const teams = {};

    const map = unwrap(holesQuery.data).reduce((acc, hole) => {
      if (!teams[hole.teamId]) {
        teams[hole.teamId] = new Set();
      }
      teams[hole.teamId].add(hole.playerName);

      if (!acc[hole.number]) {
        acc[hole.number] = [];
      }

      acc[hole.number].push({ ...hole, ...courseHoles()[hole.number] });

      return acc;
    }, {});

    const [teamAId, teamBId] = Object.keys(teams) as any;

    const _holes = Object.values(map);

    let winners = {};

    const teamAName = [...(teams?.[teamAId] ?? [])]
      .sort((a, b) => (a > b ? -1 : 1))
      .join(", ");
    const teamBName = [...(teams?.[teamBId] ?? [])]
      .sort((a, b) => (a > b ? -1 : 1))
      .join(", ");

    for (let i = 0; i < _holes.length; i++) {
      const holes = (_holes[i] as any)
        .filter((h) => h.score)
        .sort((a, b) =>
          +b.score - b.strokeHole > +a.score - a.strokeHole ? -1 : 1
        );

      if (holes.length !== 4) {
        break;
      }

      if (!winners[i]) {
        winners[i] = {};
      }

      winners[i][teamAId] = holes.find((h) => h.teamId == teamAId);
      winners[i][teamBId] = holes.find((h) => h.teamId == teamBId);
    }

    let holesWon = 0;
    for (let i = 0; i < 17; i++) {
      if (!winners[i]) {
        break;
      }
      const teamA = winners[i][teamAId];
      const teamB = winners[i][teamBId];

      const teamAScore = +teamA.score - teamA.strokeHole;
      const teamBScore = +teamB.score - teamB.strokeHole;

      let whoWon = "tie";
      if (teamAScore < teamBScore) {
        whoWon = "teamA won";
        holesWon++;
      }
      if (teamAScore > teamBScore) {
        whoWon = "teamB won";
        holesWon--;
      }
      // console.log(holesWon)
    }

    let teamAFinalScore;
    if (holesWon == 0) {
      teamAFinalScore = `Ev`;
    } else if (holesWon > 0) {
      teamAFinalScore = (
        <span class="flex gap-3 items-center justify-end">
          {Math.abs(holesWon)} <ArrowUp size={16} class="text-green-600" />
        </span>
      );
    } else {
      teamAFinalScore = (
        <span class="flex gap-3 items-center justify-end">
          {Math.abs(holesWon)} <ArrowDown size={16} class="text-red-600" />
        </span>
      );
    }

    let teamBFinalScore;
    if (holesWon == 0) {
      teamBFinalScore = `Ev`;
    } else if (holesWon < 0) {
      teamBFinalScore = (
        <span class="flex gap-3 items-center justify-end">
          {Math.abs(holesWon)} <ArrowUp size={16} class="text-green-600" />
        </span>
      );
    } else {
      teamBFinalScore = (
        <span class="flex gap-3 items-center justify-end">
          {Math.abs(holesWon)} <ArrowDown size={16} class="text-red-600" />
        </span>
      );
    }

    return {
      teamA: {
        id: teamAId,
        score: teamAFinalScore,
        name: teamAName,
      },
      teamB: {
        id: teamBId,
        score: teamBFinalScore,
        name: teamBName,
      },
      thruCount: Object.keys(winners).length,
    };
  });

  const toggleRow = (teamId) => {
    if (expandedRow() === teamId) {
      toggleDisableSnapContainer(false);
    } else {
      toggleDisableSnapContainer(true);
    }

    setExpandedRow((prev) => (prev == teamId ? null : teamId));
  };

  return (
    <Show when={leaderboard()}>
      <section class="">
        <div class="h-min grid grid-cols-[50px_1fr_40px_50px]">
          <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
            {" "}
          </span>
          <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground">
            Team
          </span>
          <span class="flex items-center h-10 text-sm font-medium text-muted-foreground">
            -
          </span>
          <span class="flex items-center h-10 text-sm px-2 font-medium text-muted-foreground justify-end">
            Thru
          </span>
        </div>
        <div>
          <div class="grid grid-cols-[50px_1fr_40px_50px] items-center">
            <span class="text-sm align-middle font-medium w-auto px-0 items-center flex">
              <button
                onClick={() => toggleRow(leaderboard().teamA?.id)}
                class="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                {expandedRow() === leaderboard().teamA?.id ? (
                  <Minus size={12} />
                ) : (
                  <Plus size={12} />
                )}
                <TableIcon size={14} />
              </button>
            </span>
            <span class="text-sm align-middle px-2 font-medium">
              {leaderboard().teamA?.name}
            </span>

            <span class="flex items-center h-10 text-sm font-medium">
              {leaderboard().teamA?.score}
            </span>

            <span class="text-sm align-middle font-medium px-2 text-center">
              {leaderboard().thruCount == 18 ? "F" : leaderboard().thruCount}
            </span>
          </div>
        </div>
        <Show when={expandedRow() == leaderboard().teamA?.id}>
          <Scorecard
            courseHoles={courseHoles}
            teamData={() => holesPerTeam()?.[leaderboard().teamA?.id] ?? {}}
          />
        </Show>
        <div>
          <div class="grid grid-cols-[50px_1fr_40px_50px] items-center">
            <span class="text-sm align-middle font-medium w-auto px-0 items-center flex">
              <button
                onClick={() => toggleRow(leaderboard().teamB?.id)}
                class="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                {expandedRow() === leaderboard().teamB?.id ? (
                  <Minus size={12} />
                ) : (
                  <Plus size={12} />
                )}
                <TableIcon size={14} />
              </button>
            </span>
            <span class="text-sm align-middle px-2 font-medium">
              {leaderboard().teamB?.name}
            </span>

            <span class="flex items-center h-10 text-sm font-medium">
              {leaderboard().teamB?.score}
            </span>

            <span class="text-sm align-middle font-medium px-2 text-center">
              {leaderboard().thruCount == 18 ? "F" : leaderboard().thruCount}
            </span>
          </div>
        </div>
        <Show when={expandedRow() === leaderboard().teamB?.id}>
          <Scorecard
            courseHoles={courseHoles}
            teamData={() => holesPerTeam()?.[leaderboard().teamB?.id] ?? {}}
          />
        </Show>
      </section>
    </Show>
  );
};

export default MatchPlayLeaderboard;
