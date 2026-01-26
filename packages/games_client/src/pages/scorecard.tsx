import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { Route } from '@solidjs/router';
import { useQuery, useMutation } from '@tanstack/solid-query';

import { updateHoles, updateTeamHole } from '~/api/holes';
import { fetchTournamentById } from '~/api/tournaments';
import { useTeam } from '~/hooks/useTeam';

import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';

import { groupByIdMap, reduceToByIdMap } from '~/lib/utils';
import type { UpdateScorePayload } from '~/lib/hole';

import type { PlayerState } from '~/state/schema';
import { updateEntity, useEntities, useEntityById } from '~/state/entities';
import { isLandscape } from '~/state/ui';
import { useTeamHoles } from '~/hooks/useHoles';
import { Bottomsheet } from '~/components/bottom_sheet';
import TournamentView from '~/components/tournament_view';

const NUM_HOLES = 18;

const getScoreType = (score: number | string, par: number) => {
  const diff = Number(score) - par;
  if (diff === -3) return 'albatross';
  if (diff == -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double-bogey';
  if (diff >= 3) return 'triple-plus';
  return;
};

const getScoreStyles = (
  scoreType: string | undefined,
  size: 'sm' | 'lg' = 'lg',
) => {
  const baseStyles =
    size === 'lg'
      ? 'text-2xl font-bold flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border-gray-600'
      : 'text-xl font-bold flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border-gray-600 w-10 h-10';

  switch (scoreType) {
    case 'albatross':
      return `${baseStyles} rounded-full border-2`;
    case 'eagle':
      return `${baseStyles} rounded-full border-2`;
    case 'birdie':
      return `${baseStyles} rounded-full border-2`;
    case 'bogey':
      return `${baseStyles} rounded-none border-2`;
    case 'double-bogey':
      return `${baseStyles} rounded-none border-2`;
    case 'triple-plus':
      return `${baseStyles} rounded-none border-2`;
    default:
      return baseStyles;
  }
};

const ScoreInnerBorders = ({
  scoreType,
}: {
  scoreType: string | undefined;
}) => {
  if (scoreType === 'albatross') {
    return (
      <>
        <div class="absolute rounded-full inset-2 border-2 border-gray-600 pointer-events-none" />
        <div class="absolute rounded-full inset-4 border-1 border-gray-600 pointer-events-none" />
      </>
    );
  }
  if (scoreType === 'eagle') {
    return (
      <div class="absolute rounded-full inset-2 border-2 border-gray-600 pointer-events-none" />
    );
  }
  if (scoreType === 'double-bogey') {
    return (
      <div class="absolute inset-2 border-2 border-gray-600 pointer-events-none rounded-none" />
    );
  }
  if (scoreType === 'triple-plus') {
    return (
      <>
        <div class="absolute inset-2 border-2 border-gray-600 pointer-events-none rounded-none" />
        <div class="absolute inset-4 border-2 border-gray-500 pointer-events-none rounded-none" />
      </>
    );
  }
  return null;
};

const ScoreInnerBordersSmall = ({
  scoreType,
}: {
  scoreType: string | undefined;
}) => {
  if (scoreType === 'albatross') {
    return (
      <>
        <div class="absolute rounded-full inset-1 border-2 border-gray-600 pointer-events-none" />
        <div class="absolute rounded-full inset-2 border-1 border-gray-600 pointer-events-none" />
      </>
    );
  }
  if (scoreType === 'eagle') {
    return (
      <div class="absolute rounded-full inset-1 border-2 border-gray-600 pointer-events-none" />
    );
  }
  if (scoreType === 'double-bogey') {
    return (
      <div class="absolute inset-1 border-2 border-gray-600 pointer-events-none rounded-none" />
    );
  }
  if (scoreType === 'triple-plus') {
    return (
      <>
        <div class="absolute inset-1 border-2 border-gray-600 pointer-events-none rounded-none" />
        <div class="absolute inset-2 border-2 border-gray-500 pointer-events-none rounded-none" />
      </>
    );
  }
  return null;
};

interface GolfScoreDisplayProps {
  score: number | string;
  par: number;
  class?: string;
  children?: any;
}

const GolfScoreDisplay: Component<GolfScoreDisplayProps> = (props) => {
  const scoreType = createMemo(() => getScoreType(props.score, props.par));

  if (props.par == 5 && props.score == 1) return null;

  return (
    <div
      class={`${getScoreStyles(scoreType(), 'sm')} ${props.class || ''} relative`}
    >
      <ScoreInnerBordersSmall scoreType={scoreType()} />
      <span class="relative z-1">{props.score}</span>
      {props.children}
    </div>
  );
};

interface GolfScoreButtonProps {
  score: number | string;
  par: number;
  onClick: () => void;
  class?: string;
}

const GolfScoreButton: Component<GolfScoreButtonProps> = (props) => {
  const scoreType = createMemo(() => getScoreType(props.score, props.par));

  if (props.par == 5 && props.score == 1) return null;

  return (
    <button
      class={`${getScoreStyles(scoreType(), 'lg')} ${props.class || ''} relative`}
      onClick={props.onClick}
    >
      <ScoreInnerBorders scoreType={scoreType()} />
      <span class="relative z-1 px-6 py-4">{props.score}</span>
    </button>
  );
};

type ScoreData = {
  playerId?: string;
  holeNumber: number;
} | null;

const ScoreCard = () => {
  const session = useSessionStore(identity);
  const tournamentById = useEntityById('tournament');
  const course = useEntityById('course');
  const teamById = useEntityById('team');
  const allPlayers = useEntities<PlayerState>('player');
  const teamHoles = useTeamHoles();

  const [openScorePanelData, setOpenScorePanelData] =
    createSignal<ScoreData>(null);

  const tournament = createMemo(() => tournamentById(session().tournamentId));

  const isTeamScoring = createMemo(() => tournament()?.isTeamScoring);

  const saveMutation = useMutation<{ id: number }[], any, any, any>(() => ({
    mutationFn: async (payload: UpdateScorePayload) => {
      try {
        if (isTeamScoring()) {
          const response = await updateTeamHole(payload);
          // Server returns single score object, wrap in array
          return [response.data];
        } else {
          const response = await updateHoles([payload]);
          return response.data;
        }
      } catch (e) {
        console.error('Failed to save score', e);
      }
    },
    onSuccess(scores) {
      if (scores) {
        scores.forEach((score) => {
          updateEntity('score', score.id, score);
        });
      }
    },
    onError(err) {
      console.error('Mutation failed:', err);
    },
  }));

  const team = createMemo(() => {
    const id = session()?.teamId;
    return id ? teamById(id) : undefined;
  });

  const teamPlayers = createMemo(() => reduceToByIdMap(allPlayers(), 'id'));

  const playersList = createMemo(() =>
    Object.values(teamPlayers()).sort((a, b) => a.name.localeCompare(b.name)),
  );

  const courseHoles = createMemo(() => {
    const holes = course('current').meta.holes || [];
    return [...holes].sort((a, b) => a.number - b.number);
  });

  const holes = createMemo(() => {
    const scoresByHole = groupByIdMap(teamHoles(), 'number');
    const ch = courseHoles();

    const holeNumbers =
      ch.length > 0
        ? ch.map((h) => h.number)
        : Array.from({ length: NUM_HOLES }, (_, i) => i + 1);

    if (isTeamScoring()) {
      return holeNumbers.map((holeNum) => {
        const scores = scoresByHole[holeNum] || [];
        const teamScore = scores.find((s) => s.teamId === team()?.id);
        return [teamScore || null];
      });
    }

    const players = playersList();
    return holeNumbers.map((holeNum) => {
      const scores = scoresByHole[holeNum] || [];
      const scoreMap = reduceToByIdMap(scores, 'playerId');
      return players.map((p) => scoreMap[p.id] || null);
    });
  });

  const updateScore = ({
    playerId,
    score,
  }: {
    playerId?: string;
    score: string;
  }) => {
    const data = openScorePanelData();
    if (!data) return;

    const holeNumber = data.holeNumber;
    const courseHoleId = courseHoles().find((h) => h.number === holeNumber)?.id;

    if (!courseHoleId) return;

    const payload: UpdateScorePayload = {
      tournamentId: Number(session()?.tournamentId),
      teamId: Number(team()?.id),
      courseHoleId: courseHoleId,
      strokes: Number(score),
    };

    if (!isTeamScoring()) {
      payload.playerId = Number(playerId);
    }

    saveMutation.mutate(payload);

    setOpenScorePanelData(null);
  };

  const getDots = ({
    playerId,
    allowedHandicap,
    holeHandicap,
  }: {
    playerId: number | undefined;
    holeHandicap: number;
    allowedHandicap: number;
  }) => {
    const player = teamPlayers()?.[playerId!];
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

  const selectHoleScore = (
    player: PlayerState | undefined,
    holeNum: number,
  ) => {
    if (!isLandscape()) {
      setOpenScorePanelData({
        playerId: player ? String(player.id) : undefined,
        holeNumber: holeNum,
      });
    }
  };

  const rows = createMemo(() => {
    if (isTeamScoring()) {
      return [
        {
          id: 'team',
          name: team()?.name || 'Team',
          isTeamRow: true,
        },
      ];
    }
    return playersList();
  });

  return (
    <div class="bg-white h-full flex flex-col w-full rounded-lg shadow-sm overflow-hidden border">
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-center border-collapse">
          <thead>
            <tr>
              <th class="p-2 border-b bg-gray-100 sticky left-0 z-10 text-md text-left">
                Hole
              </th>
              <For each={courseHoles()}>
                {(h) => {
                  return (
                    <th class="p-2 border-b min-w-[60px] bg-gray-50 border-l text-sm">
                      <span class="font-bold">{h.number}</span>
                    </th>
                  );
                }}
              </For>
            </tr>
            <tr>
              <th class="p-2 border-b bg-gray-100 sticky left-0 z-10 text-xs text-left">
                <div>Par</div>
                <div>Handicap</div>
              </th>
              <For each={courseHoles()}>
                {(h) => {
                  return (
                    <th class="p-2 border-b min-w-[60px] bg-gray-50 border-l">
                      <div class="flex flex-col">
                        <span class="text-xs font-normal text-gray-500">
                          {h.par}
                        </span>
                        <span class="text-[10px] font-light text-gray-400">
                          {h.handicap}
                        </span>
                      </div>
                    </th>
                  );
                }}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row, rIdx) => (
                <tr>
                  <td class="p-2 border-b font-medium text-left sticky left-0 bg-gray-50 text-sm z-10">
                    {row.name}
                  </td>
                  <For each={holes()}>
                    {(holeScores, hIdx) => {
                      const courseHole = courseHoles()[hIdx()];
                      const holeNum = courseHole?.number || hIdx() + 1;
                      const par = courseHole?.par || 4;
                      const scoreData = holeScores[rIdx()];
                      const score = scoreData?.score;

                      return (
                        <td
                          class="p-2 border-b border-l hover:bg-gray-50 cursor-pointer relative"
                          onClick={() =>
                            selectHoleScore(
                              isTeamScoring()
                                ? undefined
                                : (row as PlayerState),
                              holeNum,
                            )
                          }
                        >
                          <div class="flex flex-col items-center justify-around h-15 relative">
                            <Show when={!isTeamScoring()}>
                              <div class="flex space-x-1 mt-1">
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
                                class="pointer-events-none"
                              />
                            ) : (
                              <span class="text-lg font-bold text-gray-300">
                                -
                              </span>
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

      <Show when={!isLandscape() && openScorePanelData()}>
        <Bottomsheet
          variant="snap"
          defaultSnapPoint={({ maxHeight }) => maxHeight / 2 + 75}
          snapPoints={({ maxHeight }) => [maxHeight / 2 + 75]}
          onClose={() => setOpenScorePanelData(null)}
        >
          <div class="mt-6 px-4">
            <div class="text-center mb-4">
              <h3 class="text-lg font-bold">
                Hole {openScorePanelData()?.holeNumber} -{' '}
                {isTeamScoring()
                  ? team()?.name
                  : teamPlayers()[Number(openScorePanelData()?.playerId)]?.name}
              </h3>
            </div>
            <div class="grid grid-cols-3 justify-center">
              <For each={['1', '2', '3', '4', '5', '6', '7', '8', 'X']}>
                {(score, index) => {
                  const row = Math.floor(index() / 3);
                  const col = index() % 3;
                  const holeNum = openScorePanelData()?.holeNumber;
                  const par =
                    courseHoles().find((h) => h.number === holeNum)?.par || 4;

                  let gridBorders = 'flex justify-center p-4';
                  if (col < 2) gridBorders += ' border-r-2 border-gray-400';
                  if (row < 2) gridBorders += ' border-b-2 border-gray-400';

                  return (
                    <div class={gridBorders}>
                      <GolfScoreButton
                        score={score}
                        par={par}
                        onClick={() => {
                          if (openScorePanelData()) {
                            updateScore({
                              playerId: openScorePanelData()!.playerId,
                              score,
                            });
                          }
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
    </div>
  );
};

export default () => {
  return (
    <Route
      path="/scorecard"
      component={() => {
        const team = useTeam();
        return (
          <Show when={team()?.id}>
            <TournamentView>
              <ScoreCard />
            </TournamentView>
          </Show>
        );
      }}
    />
  );
};
