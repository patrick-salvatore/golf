import { Component, createSignal, For, Show } from 'solid-js';
import { useQuery, useQueryClient, useMutation } from '@tanstack/solid-query';
import { Trash2, Edit2, Save, X } from 'lucide-solid';

type ColumnInfo = {
  name: string;
  type: string;
  pk: number;
};

type IndexInfo = {
  name: string;
  unique: boolean;
  columns: string[];
};

const SchemaEditor: Component<{ tableName: string }> = (props) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = createSignal<'columns' | 'indexes'>('columns');
  
  // -- Columns Logic --
  const schemaQuery = useQuery(() => ({
    queryKey: ['schema', props.tableName],
    queryFn: async () => {
      const res = await fetch(`api/tables/${props.tableName}/schema`);
      return res.json() as Promise<ColumnInfo[]>;
    },
  }));

  const [newCol, setNewCol] = createSignal({
    name: '',
    type: 'TEXT',
    notNull: false,
    defaultValue: '',
  });

  const [editingColumn, setEditingColumn] = createSignal<string | null>(null);
  const [editName, setEditName] = createSignal('');

  const addColumnMutation = useMutation(() => ({
    mutationFn: async () => {
      const payload = {
        ...newCol(),
        defaultValue: newCol().defaultValue || null, // send null if empty
      };
      const res = await fetch(`api/tables/${props.tableName}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add column');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schema', props.tableName] });
      queryClient.invalidateQueries({ queryKey: ['data', props.tableName] });
      setNewCol({ name: '', type: 'TEXT', notNull: false, defaultValue: '' });
    },
  }));

  const renameColumnMutation = useMutation(() => ({
    mutationFn: async (payload: { oldName: string, newName: string }) => {
      const res = await fetch(`api/tables/${props.tableName}/columns/${payload.oldName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: payload.newName }),
      });
      if (!res.ok) throw new Error('Failed to rename column');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schema', props.tableName] });
      queryClient.invalidateQueries({ queryKey: ['data', props.tableName] });
      setEditingColumn(null);
    },
  }));

  const dropColumnMutation = useMutation(() => ({
    mutationFn: async (colName: string) => {
      const res = await fetch(`api/tables/${props.tableName}/columns/${colName}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to drop column');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schema', props.tableName] });
      queryClient.invalidateQueries({ queryKey: ['data', props.tableName] });
    },
  }));

  // -- Indexes Logic --
  const indexesQuery = useQuery(() => ({
    queryKey: ['indexes', props.tableName],
    queryFn: async () => {
      const res = await fetch(`api/tables/${props.tableName}/indexes`);
      return res.json() as Promise<IndexInfo[]>;
    },
  }));

  const [newIndex, setNewIndex] = createSignal({
    name: '',
    unique: false,
    columns: [] as string[],
  });

  const createIndexMutation = useMutation(() => ({
    mutationFn: async () => {
      const res = await fetch(`api/tables/${props.tableName}/indexes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIndex()),
      });
      if (!res.ok) throw new Error('Failed to create index');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes', props.tableName] });
      setNewIndex({ name: '', unique: false, columns: [] });
    },
  }));

  const dropIndexMutation = useMutation(() => ({
    mutationFn: async (name: string) => {
      const res = await fetch(`api/indexes/${name}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to drop index');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes', props.tableName] });
    },
  }));

  return (
    <div class="space-y-6">
      <div class="flex border-b border-gray-200">
        <button
          class={`flex-1 py-2 text-sm font-medium ${
            activeTab() === 'columns'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('columns')}
        >
          Columns
        </button>
        <button
          class={`flex-1 py-2 text-sm font-medium ${
            activeTab() === 'indexes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('indexes')}
        >
          Indexes
        </button>
      </div>

      <Show when={activeTab() === 'columns'}>
        <div class="space-y-4">
          {/* Add Column Form */}
          <div class="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 class="text-sm font-semibold text-gray-700">Add New Column</h3>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Name</label>
              <input
                class="w-full px-2 py-1.5 border rounded text-sm"
                value={newCol().name}
                onInput={(e) => setNewCol((p) => ({ ...p, name: e.currentTarget.value }))}
                placeholder="e.g. email"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  class="w-full px-2 py-1.5 border rounded text-sm bg-white"
                  value={newCol().type}
                  onChange={(e) => setNewCol((p) => ({ ...p, type: e.currentTarget.value }))}
                >
                  <option value="TEXT">TEXT</option>
                  <option value="INTEGER">INTEGER</option>
                  <option value="REAL">REAL</option>
                  <option value="BLOB">BLOB</option>
                  <option value="NUMERIC">NUMERIC</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="DATETIME">DATETIME</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Default Value</label>
                <input
                  class="w-full px-2 py-1.5 border rounded text-sm"
                  value={newCol().defaultValue}
                  onInput={(e) => setNewCol((p) => ({ ...p, defaultValue: e.currentTarget.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="notNull"
                checked={newCol().notNull}
                onChange={(e) => setNewCol((p) => ({ ...p, notNull: e.currentTarget.checked }))}
              />
              <label for="notNull" class="text-sm text-gray-700">Not Null</label>
            </div>
            <button
              onClick={() => addColumnMutation.mutate()}
              disabled={!newCol().name || addColumnMutation.isPending}
              class="w-full py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add Column
            </button>
          </div>

          {/* List Columns */}
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-700">Existing Columns</h3>
            <For each={schemaQuery.data}>
              {(col) => (
                <div class="flex items-center justify-between p-2 bg-white border rounded text-sm">
                  <div class="flex items-center gap-2 flex-1">
                    <Show 
                      when={editingColumn() === col.name}
                      fallback={
                        <>
                          <span class="font-medium text-gray-800">{col.name}</span>
                          <button
                            onClick={() => {
                              setEditingColumn(col.name);
                              setEditName(col.name);
                            }}
                            class="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <Edit2 class="w-3 h-3" />
                          </button>
                        </>
                      }
                    >
                      <div class="flex items-center gap-1 flex-1">
                        <input
                          class="w-full px-1 py-0.5 border rounded text-sm"
                          value={editName()}
                          onInput={(e) => setEditName(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameColumnMutation.mutate({ oldName: col.name, newName: editName() });
                            if (e.key === 'Escape') setEditingColumn(null);
                          }}
                          autofocus
                        />
                        <button
                          onClick={() => renameColumnMutation.mutate({ oldName: col.name, newName: editName() })}
                          class="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save class="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingColumn(null)}
                          class="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X class="w-3 h-3" />
                        </button>
                      </div>
                    </Show>
                    <span class="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{col.type}</span>
                    {col.pk ? <span class="text-xs text-yellow-600 font-bold">PK</span> : null}
                  </div>
                  <button
                    onClick={() => {
                        if (confirm(`Are you sure you want to drop column "${col.name}"? This action cannot be undone.`)) {
                            dropColumnMutation.mutate(col.name);
                        }
                    }}
                    class="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Drop Column"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={activeTab() === 'indexes'}>
        <div class="space-y-4">
          {/* Create Index Form */}
          <div class="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 class="text-sm font-semibold text-gray-700">Create Index</h3>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Index Name</label>
              <input
                class="w-full px-2 py-1.5 border rounded text-sm"
                value={newIndex().name}
                onInput={(e) => setNewIndex((p) => ({ ...p, name: e.currentTarget.value }))}
                placeholder="idx_table_col"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Columns (select in order)</label>
              <div class="w-full border rounded bg-white max-h-48 overflow-y-auto p-2 space-y-1">
                <For each={schemaQuery.data}>
                  {(col) => {
                    const isSelected = () => newIndex().columns.includes(col.name);
                    const order = () => newIndex().columns.indexOf(col.name) + 1;
                    
                    return (
                      <div 
                        class={`flex items-center justify-between p-1.5 rounded cursor-pointer text-sm ${isSelected() ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'}`}
                        onClick={() => {
                          const current = newIndex().columns;
                          if (current.includes(col.name)) {
                            setNewIndex(p => ({ ...p, columns: current.filter(c => c !== col.name) }));
                          } else {
                            setNewIndex(p => ({ ...p, columns: [...current, col.name] }));
                          }
                        }}
                      >
                        <div class="flex items-center gap-2">
                          <div class={`w-4 h-4 border rounded flex items-center justify-center ${isSelected() ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            <Show when={isSelected()}>
                              <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </Show>
                          </div>
                          <span class="text-gray-700">{col.name}</span>
                        </div>
                        <Show when={isSelected()}>
                          <span class="text-xs bg-blue-200 text-blue-800 px-1.5 rounded-full font-medium">
                            {order()}
                          </span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="unique"
                checked={newIndex().unique}
                onChange={(e) => setNewIndex((p) => ({ ...p, unique: e.currentTarget.checked }))}
              />
              <label for="unique" class="text-sm text-gray-700">Unique</label>
            </div>
            <button
              onClick={() => createIndexMutation.mutate()}
              disabled={!newIndex().name || newIndex().columns.length === 0 || createIndexMutation.isPending}
              class="w-full py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Create Index
            </button>
          </div>

          {/* List Indexes */}
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-700">Existing Indexes</h3>
            <For each={indexesQuery.data}>
              {(idx) => (
                <div class="flex items-center justify-between p-2 bg-white border rounded text-sm">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-800">{idx.name}</span>
                      {idx.unique && <span class="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">UNIQUE</span>}
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      {idx.columns.join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => dropIndexMutation.mutate(idx.name)}
                    class="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Drop Index"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default SchemaEditor;
