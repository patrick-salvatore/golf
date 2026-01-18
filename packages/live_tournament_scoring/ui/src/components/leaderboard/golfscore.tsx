import type { Component } from "solid-js";
import { cn } from "~/lib/cn";

const GolfScoreButton: Component<{
  score: number;
  par: number;
  class?: string;
}> = (props) => {
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
      "text-sm font-bold flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border-gray-600 bg-transparent";

    switch (scoreType) {
      case "albatross":
        return `${baseStyles} rounded-full border-1`;

      case "eagle":
        return `${baseStyles} rounded-full border-1`;

      case "birdie":
        return `${baseStyles} rounded-full border-1`;

      case "bogey":
        return `${baseStyles} rounded-none border-1`;

      case "double-bogey":
        return `${baseStyles} rounded-none border-1`;

      case "triple-plus":
        return `${baseStyles} rounded-none border-1`;

      default:
        return baseStyles;
    }
  };

  const renderInnerBorders = () => {
    if (scoreType === "albatross") {
      return (
        <>
          <div class="absolute rounded-full inset-1 border-1 border-gray-600 pointer-events-none" />
          <div class="absolute rounded-full inset-1.5 border-1 border-gray-600 pointer-events-none" />
        </>
      );
    }
    if (scoreType === "eagle") {
      return (
        <div class="absolute rounded-full inset-1 border-1 border-gray-600 pointer-events-none" />
      );
    }
    if (scoreType === "double-bogey") {
      return (
        <div class="absolute inset-1 border-1 border-gray-600 pointer-events-none rounded-none" />
      );
    }
    if (scoreType === "triple-plus") {
      return (
        <>
          <div class="absolute inset-1 border-1 border-gray-600 pointer-events-none rounded-none" />
        </>
      );
    }
    return null;
  };

  const renderDiagonalLines = () => {
    if (scoreType === "triple-plus") {
      return (
        <div
          class="absolute inset-0 pointer-events-none"
          style={{
            "background-image": `repeating-linear-gradient(
              120deg,
              transparent,
              transparent 2px,
              rgba(156, 163, 175, 0.3) 2px,
              rgba(156, 163, 175, 0.3) 4px
            )`,
          }}
        />
      );
    }
    return null;
  };

  return props.par == 5 && props.score == 1 ? null : (
    <div class={cn(getButtonStyles(), props.class, `relative`)}>
      {renderInnerBorders()}
      {renderDiagonalLines()}
      <span class="relative px-[8px] py-[4px]">{props.score}</span>
    </div>
  );
};

export default GolfScoreButton;
