import { createMemo, type Component } from 'solid-js';

export const getScoreType = (score: number | string, par: number) => {
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

export const getScoreStyles = (
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

export const ScoreInnerBorders = ({
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

export const ScoreInnerBordersSmall = ({
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

export interface GolfScoreDisplayProps {
  score: number | string;
  par: number;
  class?: string;
  children?: any;
}

export const GolfScoreDisplay: Component<GolfScoreDisplayProps> = (props) => {
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

export interface GolfScoreButtonProps {
  score: number | string;
  par: number;
  onClick: () => void;
  class?: string;
}

export const GolfScoreButton: Component<GolfScoreButtonProps> = (props) => {
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
