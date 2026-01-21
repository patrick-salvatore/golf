import { type Component, Show } from 'solid-js';
import { isGlobalLoading } from '~/state/ui';

const GolfLoader: Component = () => {
  return (
    <Show when={isGlobalLoading()}>
      <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div class="relative flex flex-col items-center">
          {/* Animation Container */}
          <div class="relative h-24 w-64">
            {/* Green surface line */}
            <div class="absolute bottom-2 w-full h-0.5 bg-white/20 rounded-full"></div>

            {/* Hole */}
            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/60 rounded-[100%] z-10 blur-[1px]"></div>

            {/* Ball */}
            <div class="ball absolute bottom-[11px] w-5 h-5 bg-white rounded-full z-20 shadow-sm flex items-center justify-center overflow-hidden">
              {/* Dimples pattern using radial gradient */}
              <div class="w-full h-full bg-[radial-gradient(rgba(0,0,0,0.15)_1.5px,transparent_0)] [background-size:3px_3px]"></div>
            </div>

            {/* Flag (Pole + Cloth) - Optional, adds context */}
            <div class="absolute bottom-2 left-1/2 ml-0.5 w-0.5 h-12 bg-white/40 origin-bottom">
              <div class="absolute top-0 right-0 w-4 h-3 bg-golf-accent clip-path-flag"></div>
            </div>
          </div>

          <span class="text-white/90 font-medium tracking-widest text-xs uppercase mt-2 animate-pulse">
            Loading
          </span>
        </div>

        <style>
          {`
            .ball {
              animation: roll-in-hole 2s ease-in-out infinite;
            }
            
            .clip-path-flag {
                clip-path: polygon(100% 0, 0 50%, 100% 100%);
            }

            @keyframes roll-in-hole {
              0% {
                left: 10%;
                transform: rotate(0deg);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              65% {
                left: 50%;
                transform: translateX(-50%) rotate(720deg) scale(1);
                bottom: 11px;
              }
              75% {
                left: 50%;
                transform: translateX(-50%) rotate(720deg) scale(0.6);
                bottom: 3px; /* Falls in */
                opacity: 1;
              }
              85% {
                 left: 50%;
                 transform: translateX(-50%) scale(0);
                 opacity: 0;
              }
              100% {
                left: 10%;
                opacity: 0;
              }
            }
          `}
        </style>
      </div>
    </Show>
  );
};

export default GolfLoader;
