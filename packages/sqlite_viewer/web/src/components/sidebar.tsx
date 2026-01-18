import { Component, For, Show, createSignal } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { Database, Table, Plus } from 'lucide-solid';
import Drawer from './drawer';
import CreateTableDialog from './create_table_dialog';

const fetchTables = async () => {
  const res = await fetch('/api/tables');
  if (!res.ok) throw new Error('Failed to fetch tables');
  return res.json() as Promise<string[]>;
};

const Sidebar: Component = () => {
  const location = useLocation();
  const [isCreateOpen, setIsCreateOpen] = createSignal(false);
  
  const query = useQuery(() => ({
    queryKey: ['tables'],
    queryFn: fetchTables,
  }));

  return (
    <div class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Database class="w-6 h-6 text-blue-600" />
          <h1 class="font-bold text-gray-800 text-lg">SQLite Viewer</h1>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          class="p-1 hover:bg-gray-100 rounded text-blue-600"
          title="Create Table"
        >
          <Plus class="w-5 h-5" />
        </button>
      </div>
      
      <Drawer
        isOpen={isCreateOpen()}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Table"
      >
        <CreateTableDialog onClose={() => setIsCreateOpen(false)} />
      </Drawer>
      
      <div class="flex-1 overflow-y-auto p-2">
        <Show when={query.isLoading}>
          <div class="p-4 text-gray-500 text-sm">Loading tables...</div>
        </Show>
        
        <Show when={query.isError}>
          <div class="p-4 text-red-500 text-sm">Error loading tables</div>
        </Show>

        <ul class="space-y-1">
          <For each={query.data}>
            {(table) => (
              <li>
                <A
                  href={`/table/${table}`}
                  class={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === `/table/${table}`
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Table class="w-4 h-4" />
                  {table}
                </A>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
