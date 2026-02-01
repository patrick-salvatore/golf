import { createMemo, createResource, For, Show } from 'solid-js';
import { fetchTeamPlayers } from '~/api/player';
import { fetchRoundScores } from '~/api/scores';
import { GolfScoreDisplay } from '~/components/score/utils';
import { useEntity, useEntityById } from '~/state/entities';
import type { PlayerState } from '~/state/schema';

const NUM_HOLES = 18;

interface ScorecardReadOnlyProps {
  teamId: number;
  roundId: number;
  teamName: string;
}

export const ScorecardReadOnly = (props: ScorecardReadOnlyProps) => {
  const course = useEntity('course', 'current');
  const tournamentById = useEntityById('tournament');
  const tournament = createMemo(() => tournamentById('current'));
  const isTeamScoring = createMemo(() => tournament()?.isTeamScoring);

  const [players] = createResource(
    () => props.teamId,
    (id) => fetchTeamPlayers(id),
  );

  const [scores] = createResource(
    () => ({ teamId: props.teamId, roundId: props.roundId }),
    (params) => fetchRoundScores(params),
  );

  const courseHoles = createMemo(() => {
    const holes = course()?.meta.holes || [];
    return [...holes].sort((a, b) => a.number - b.number);
  });

  const getDots = ({
    playerId,
    allowedHandicap,
    holeHandicap,
  }: {
    playerId: number | undefined;
    holeHandicap: number;
    allowedHandicap: number;
  }) => {
    if (!players()) return 0;
    const player = players()?.find((p) => p.id === playerId);
    if (!player) return 0;

    let hcp = player.handicap;

    if (hcp * allowedHandicap >= holeHandicap) {
      return 1;
    }
    if (hcp * allowedHandicap - 18 >= holeHandicap) {
      return 2;
    }
    return 0;
  };

  const rows = createMemo(() => {
    if (!scores()) return [];

    const holeIdToNumber = new Map<number, number>();
    courseHoles().forEach((h) => holeIdToNumber.set(h.id, h.number));

    // Re-group scores by hole number for easier access
    const scoresByHoleNumber: Record<number, any[]> = {};
    (scores() || []).forEach((s) => {
      const num = holeIdToNumber.get(s.courseHoleId);
      if (num) {
        if (!scoresByHoleNumber[num]) scoresByHoleNumber[num] = [];
        scoresByHoleNumber[num].push(s);
      }
    });

    const ch = courseHoles();
    const holeNumbers =
      ch.length > 0
        ? ch.map((h) => h.number)
        : Array.from({ length: NUM_HOLES }, (_, i) => i + 1);

    if (isTeamScoring()) {
      const teamScores = holeNumbers.map((holeNum) => {
        const holeScores = scoresByHoleNumber[holeNum] || [];
        return holeScores.find((s) => s.teamId === props.teamId) || null;
      });

      return [
        {
          id: 'team',
          name: props.teamName || 'Team',
          isTeamRow: true,
          scores: teamScores,
        },
      ];
    }

    const playerList = (players() || []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return playerList.map((player) => {
      const playerScores = holeNumbers.map((holeNum) => {
        const holeScores = scoresByHoleNumber[holeNum] || [];
        return holeScores.find((s) => s.playerId === player.id) || null;
      });

      return {
        ...player,
        scores: playerScores,
      };
    });
  });

  return (
    <div class="overflow-x-auto">
      <table class="w-full text-center border-collapse text-sm">
        <thead>
          <tr>
            <th class="p-2 border-b bg-gray-100 sticky left-0 z-10 text-left min-w-[100px]">
              Hole
            </th>
            <For each={courseHoles()}>
              {(h) => (
                <th class="p-2 border-b min-w-[50px] bg-gray-50 border-l">
                  <div class="flex flex-col">
                    <span class="font-bold">{h.number}</span>
                    <span class="text-xs font-normal text-gray-500">
                      {h.par}
                    </span>
                  </div>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr>
                <td class="p-2 border-b font-medium text-left sticky left-0 bg-gray-50 z-10">
                  <div class="flex flex-col">
                    <span>{row.name}</span>
                    <Show when={!isTeamScoring()}>
                      <span class="text-xs text-gray-500">
                        {(row as PlayerState).handicap}
                      </span>
                    </Show>
                  </div>
                </td>
                <For each={row.scores}>
                  {(scoreObj, hIdx) => {
                    const courseHole = courseHoles()[hIdx()];
                    const score = scoreObj?.strokes;
                    const par = courseHole?.par || 4;

                    return (
                      <td class="p-2 border-b border-l relative">
                        <div class="flex flex-col items-center justify-around h-10 relative">
                          <Show when={!isTeamScoring()}>
                            <div class="flex space-x-1 mb-1 absolute -top-1">
                              {Array(
                                getDots({
                                  playerId: (row as PlayerState).id,
                                  allowedHandicap: courseHole.allowedHandicap,
                                  holeHandicap: courseHole.handicap,
                                }),
                              )
                                .fill(null)
                                .map(() => (
                                  <div class="w-1 h-1 bg-red-500 rounded-full" />
                                ))}
                            </div>
                          </Show>
                          {score ? (
                            <GolfScoreDisplay
                              score={score}
                              par={par}
                              class="pointer-events-none scale-90"
                            />
                          ) : (
                            <span class="text-gray-300">-</span>
                          )}
                        </div>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};
