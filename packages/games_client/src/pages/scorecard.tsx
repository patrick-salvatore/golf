import {
  createMemo,
  createSignal,
  For,
  Show,
  type Component,
  onMount,
  onCleanup,
} from 'solid-js';
import { Route } from '@solidjs/router';
import { useQueryClient, useMutation } from '@tanstack/solid-query';

import { Bottomsheet } from '~/components/bottom_sheet';
import TournamentView from '~/components/tournament_view';

import { useTeamHoles } from '~/hooks/useHoles';

import { useCourseStore } from '~/state/course';
import { identity } from '~/state/helpers';
import { useSessionStore } from '~/state/session';

import { groupByIdMap, reduceToByIdMap } from '~/lib/utils';
import type { UpdateHolePayload } from '~/lib/hole';
import type { PlayerState } from '~/state/schema';

import { updateHoles, getTeamScores } from '~/api/holes';
import { useTeam } from '~/hooks/useTeam';
import { getCourseDataByTournamentId } from '~/api/course';
import { updateEntity, useEntities, useEntityById } from '~/state/entities';
import { isLandscape, setGlobalLoadingSpinner } from '~/state/ui';

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
    if (diff === -3) return 'albatross';
    if (diff == -2) return 'eagle';
    if (diff === -1) return 'birdie';
    if (diff === 0) return 'par';
    if (diff === 1) return 'bogey';
    if (diff === 2) return 'double-bogey';
    if (diff >= 3) return 'triple-plus';
    return;
  })();

  const getButtonStyles = () => {
    const baseStyles =
      'text-2xl font-bold flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border-gray-600';

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

  const renderInnerBorders = () => {
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

  return props.par == 5 && props.score == 1 ? null : (
    <button
      class={`${getButtonStyles()} ${props.class || ''} relative`}
      onClick={props.onClick}
    >
      {renderInnerBorders()}

      <span class="relative z-1 px-6 py-4">{props.score}</span>
    </button>
  );
};

type ScoreData = {
  playerId: string;
  holeNumber: number;
} | null;

const ScoreCard = () => {
  const queryClient = useQueryClient();
  const course = useCourseStore(identity);
  const teamById = useEntityById('team');
  const allPlayers = useEntities<PlayerState>('player');
  const session = useSessionStore(identity);
  const teamHoles = useTeamHoles();

  const [openScorePanelData, setOpenScorePanelData] =
    createSignal<ScoreData>(null);

  onMount(async () => {
    const s = session();
    if (!s?.tournamentId || !s?.teamId) return;

    setGlobalLoadingSpinner(true);
    try {
      // Load Course
      const courseData = await getCourseDataByTournamentId(s.tournamentId);
      updateEntity('course', courseData.id, courseData);

      // Load Scores
      const scores = await getTeamScores(s.teamId, s.tournamentId);
      if (Array.isArray(scores)) {
        scores.forEach((score: any) => {
          updateEntity('score', score.id, score);
        });
      }
    } catch (e) {
      console.error('Failed to load scorecard data', e);
    } finally {
      setGlobalLoadingSpinner(false);
    }
  });

  const saveMutation = useMutation<any, any, UpdateHolePayload, any>(() => ({
    mutationFn: async (payload: UpdateHolePayload) => {
      try {
        const responses = await updateHoles([payload]);
        const data = responses[0]?.data;
        if (data) {
          updateEntity('score', data.id, data);
        }
      } catch (e) {
        console.error('Failed to save score', e);
      }
    },
  }));

  const team = createMemo(() => {
    const id = session()?.teamId;
    return id ? teamById(id) : undefined;
  });

  const teamPlayers = createMemo(() => reduceToByIdMap(allPlayers(), 'id'));

  const holes = createMemo(() => groupByIdMap(teamHoles(), 'number'));

  const updateScore = ({
    playerId,
    score,
  }: {
    playerId: string;
    score: string;
  }) => {
    const data = openScorePanelData();
    if (!data) return;

    const holeNumber = data.holeNumber;
    const courseHoleId = course().holes?.find(
      (h) => h.number === holeNumber,
    )?.id;

    if (!courseHoleId) return;

    // Optimistic or Direct Save
    const payload: UpdateHolePayload = {
      tournamentId: Number(session()?.tournamentId),
      playerId: Number(playerId),
      teamId: Number(team()?.id),
      courseHoleId: courseHoleId,
      strokes: Number(score),
    };

    saveMutation.mutate(payload);

    setOpenScorePanelData(null);
  };

  const getDots = (playerId: number, holeNumber: number) => {
    const player = teamPlayers()?.[playerId];
    const courseHoleData = course().holes?.find((h) => h.number === holeNumber);

    if (!player || !courseHoleData) return 0;

    const hcp = player.handicap;
    const holeIndex = courseHoleData.holeIndex ?? courseHoleData.handicap; // Fallback to handicap if holeIndex missing

    let dots = 0;
    if (hcp >= holeIndex) dots = 1;
    if (hcp - 18 >= holeIndex) dots = 2;

    return dots;
  };

  const getScore = (playerId: number, holeNumber: number) => {
    const scoresForHole = holes()[holeNumber] || [];
    const s = scoresForHole.find((s) => s.playerId === playerId);
    return s ? s.score : null;
  };

  const selectHoleScore = (player, holeNum) => {
    if (!isLandscape()) {
      setOpenScorePanelData({
        playerId: String(player.id),
        holeNumber: holeNum,
      });
    }
  };

  return (
    <div class="bg-white h-full flex flex-col">
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-center border-collapse">
          <thead>
            <tr>
              <th class="p-2 border-b bg-gray-50 sticky left-0 z-1 text-md text-left">
                Hole
              </th>
              <For each={Array.from({ length: NUM_HOLES }, (_, i) => i + 1)}>
                {(holeNum) => {
                  const h = course().holes?.find((ch) => ch.number === holeNum);
                  return (
                    <th class="p-2 border-b min-w-[60px] bg-gray-50 border-l text-sm">
                      <span class="font-bold">{holeNum}</span>
                    </th>
                  );
                }}
              </For>
            </tr>
            <tr>
              <th class="p-2 border-b bg-gray-50 sticky left-0 z-1 text-xs text-left">
                <div>Par</div>
                <div>Handicap</div>
              </th>
              <For each={Array.from({ length: NUM_HOLES }, (_, i) => i + 1)}>
                {(holeNum) => {
                  const h = course().holes?.find((ch) => ch.number === holeNum);
                  return (
                    <th class="p-2 border-b min-w-[60px] bg-gray-50 border-l">
                      <div class="flex flex-col">
                        <span class="text-xs font-normal text-gray-500">
                          {h?.par}
                        </span>
                        <span class="text-[10px] font-light text-gray-400">
                          {h?.holeIndex ?? h?.handicap}
                        </span>
                      </div>
                    </th>
                  );
                }}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={Object.values(teamPlayers())}>
              {(player) => (
                <tr>
                  <td class="p-2 border-b font-medium text-left sticky left-0 bg-white text-sm z-1 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {player.name}
                  </td>
                  <For
                    each={Array.from({ length: NUM_HOLES }, (_, i) => i + 1)}
                  >
                    {(holeNum) => {
                      const dots = getDots(player.id, holeNum);
                      const score = getScore(player.id, holeNum);

                      return (
                        <td
                          class="p-2 border-b border-l hover:bg-gray-50 cursor-pointer relative h-16"
                          onClick={() => selectHoleScore(player, holeNum)}
                        >
                          <div class="flex flex-col items-center justify-center h-full">
                            <span class="text-lg font-bold text-gray-800">
                              {score || '-'}
                            </span>
                            <Show when={dots > 0}>
                              <div class="flex space-x-1 mt-1">
                                {Array(dots)
                                  .fill(null)
                                  .map(() => (
                                    <div class="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                  ))}
                              </div>
                            </Show>
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

      <Show when={openScorePanelData() && !team()?.finished}>
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
                {teamPlayers()[Number(openScorePanelData()?.playerId)]?.name}
              </h3>
            </div>
            <div class="grid grid-cols-3 justify-center">
              <For each={['1', '2', '3', '4', '5', '6', '7', '8', 'X']}>
                {(score, index) => {
                  const row = Math.floor(index() / 3);
                  const col = index() % 3;
                  const holeNum = openScorePanelData()?.holeNumber;
                  const par =
                    course().holes?.find((h) => h.number === holeNum)?.par || 4;

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
