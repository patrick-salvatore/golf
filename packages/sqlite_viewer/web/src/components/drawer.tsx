import { Component, JSX, Show } from 'solid-js';
import { X } from 'lucide-solid';

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
};

const Drawer: Component<DrawerProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div 
          class="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
          onClick={props.onClose}
        />
        
        {/* Panel */}
        <div class="relative w-full max-w-md h-full bg-white shadow-xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-800">{props.title}</h2>
            <button 
              onClick={props.onClose}
              class="p-1 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-4">
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Drawer;
