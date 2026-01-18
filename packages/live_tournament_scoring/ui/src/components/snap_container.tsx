import {
  createSignal,
  onCleanup,
  children,
  For,
  Show,
  createEffect,
} from "solid-js";
import type { Component, JSX } from "solid-js";
import { animate } from "motion";

const [disableSnap, _toggleDisableSnapContainer] = createSignal(false);

export const toggleDisableSnapContainer = _toggleDisableSnapContainer;

const SnapContainer: Component<{ children: JSX.Element }> = (props) => {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [swipeDirection, setSwipeDirection] = createSignal<string | null>(null);
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();

  const resolved = children(() => props.children);
  const childrenArray = () => {
    const kids = resolved();
    return Array.isArray(kids) ? kids : [kids];
  };

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let hasMovedSignificantly = false;
  let startTime = 0;

  const MIN_SWIPE_DISTANCE = 30; // Minimum distance to consider it a swipe
  const SWIPE_THRESHOLD = 80; // Distance needed to trigger snap
  const MAX_VERTICAL_DRIFT = 50; // Maximum vertical movement allowed
  const MIN_SWIPE_VELOCITY = 0.3; // pixels per millisecond

  const handleTouchStart = (e: TouchEvent) => {
    if (disableSnap()) {
      return;
    }

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    currentX = startX;
    currentY = startY;
    isDragging = true;
    hasMovedSignificantly = false;
    startTime = Date.now();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    currentX = touch.clientX;
    currentY = touch.clientY;

    const deltaX = Math.abs(currentX - startX);
    const deltaY = Math.abs(currentY - startY);

    // Check if user has moved significantly
    if (deltaX > MIN_SWIPE_DISTANCE || deltaY > MIN_SWIPE_DISTANCE) {
      hasMovedSignificantly = true;
    }

    // Only allow horizontal movement if it's primarily horizontal
    if (deltaX > deltaY && deltaY < MAX_VERTICAL_DRIFT) {
      const container = containerRef();
      if (container) {
        const offset = currentX - startX;
        container.style.transform = `translateX(${offset}px)`;
      }
    } else if (deltaY > deltaX) {
      // If it's primarily vertical movement, cancel the drag
      isDragging = false;
      const container = containerRef();
      if (container) {
        container.style.transform = "translateX(0)";
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const endTime = Date.now();
    const swipeTime = endTime - startTime;
    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);
    const velocity = Math.abs(deltaX) / swipeTime;

    isDragging = false;

    const container = containerRef();
    if (!container) return;

    // Only proceed if user has moved significantly and it's primarily horizontal
    if (!hasMovedSignificantly || deltaY > MAX_VERTICAL_DRIFT) {
      container.style.transform = "translateX(0)";
      return;
    }

    const children = childrenArray();
    const shouldSnap =
      Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > MIN_SWIPE_VELOCITY;

    if (shouldSnap && deltaX < 0 && currentIndex() < children.length - 1) {
      // Swipe left - go to next
      setSwipeDirection("left");
      setCurrentIndex(currentIndex() + 1);
      animate(container, { x: "-100%" }, { duration: 0.2 }).then(() => {
        container.style.transform = "translateX(0)";
      });
    } else if (shouldSnap && deltaX > 0 && currentIndex() > 0) {
      // Swipe right - go to previous
      setSwipeDirection("right");
      setCurrentIndex(currentIndex() - 1);
      animate(container, { x: "100%" }, { duration: 0.2 }).then(() => {
        container.style.transform = "translateX(0)";
      });
    } else {
      // Reset to original position
      setSwipeDirection(null);
      animate(container, { x: 0 }, { duration: 0.2 });
    }
  };

  return (
    <div class="relative h-full overflow-hidden py-3">
      <div class="mb-4 flex justify-center space-x-1">
        <For each={childrenArray()}>
          {(_, index) => (
            <div
              class={`h-1 transition-all duration-300 ${
                index() === currentIndex()
                  ? "w-8 bg-primary"
                  : "w-4 bg-gray-500"
              }`}
            />
          )}
        </For>
      </div>

      <For each={childrenArray()}>
        {(child, index) => (
          <Show when={index() === currentIndex()}>
            <div
              ref={setContainerRef}
              class="h-full min-h-[calc(100vh_-_325px)] w-full transition-opacity duration-400"
              style={{
                opacity: index() === currentIndex() ? 1 : 0,
                "touch-action": "pan-y",
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {child}
            </div>
          </Show>
        )}
      </For>
    </div>
  );
};

export default SnapContainer;
