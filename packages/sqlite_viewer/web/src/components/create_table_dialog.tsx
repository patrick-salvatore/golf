import { Component, createSignal, For } from 'solid-js';
import { useMutation, useQueryClient } from '@tanstack/solid-query';
import { useNavigate } from '@solidjs/router';
import { Trash2, Plus } from 'lucide-solid';

type ColumnDef = {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
  defaultValue: string;
};

const CreateTableDialog: Component<{ onClose: () => void }> = (props) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tableName, setTableName] = createSignal('');
  const [columns, setColumns] = createSignal<ColumnDef[]>([
    { name: 'id', type: 'TEXT', notNull: true, pk: true, defaultValue: '' }
  ]);

  const createTableMutation = useMutation(() => ({
    mutationFn: async () => {
      const payload = {
        name: tableName(),
        columns: columns().map(c => ({
            ...c,
            defaultValue: c.defaultValue || null
        })),
      };
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create table');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      props.onClose();
      navigate(`/table/${tableName()}`);
    },
  }));

  const addColumn = () => {
    setColumns([...columns(), { name: '', type: 'TEXT', notNull: false, pk: false, defaultValue: '' }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns().filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDef, value: any) => {
    const newCols = [...columns()];
    newCols[index] = { ...newCols[index], [field]: value };
    setColumns(newCols);
  };

  return (
    <div class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
        <input
          class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={tableName()}
          onInput={(e) => setTableName(e.currentTarget.value)}
          placeholder="e.g. products"
          autofocus
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Columns</label>
          <button
            onClick={addColumn}
            class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <Plus class="w-3 h-3" /> Add Column
          </button>
        </div>
        
        <div class="space-y-3">
          <For each={columns()}>
            {(col, i) => (
              <div class="flex gap-2 items-start bg-gray-50 p-2 rounded border">
                <div class="flex-1 space-y-2">
                  <div class="flex gap-2">
                    <input
                      class="flex-1 px-2 py-1 text-sm border rounded"
                      placeholder="Name"
                      value={col.name}
                      onInput={(e) => updateColumn(i(), 'name', e.currentTarget.value)}
                    />
                    <select
                      class="w-24 px-2 py-1 text-sm border rounded bg-white"
                      value={col.type}
                      onChange={(e) => updateColumn(i(), 'type', e.currentTarget.value)}
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
                  <div class="flex gap-2 items-center">
                    <input
                      class="flex-1 px-2 py-1 text-xs border rounded"
                      placeholder="Default Value"
                      value={col.defaultValue}
                      onInput={(e) => updateColumn(i(), 'defaultValue', e.currentTarget.value)}
                    />
                    <label class="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={col.pk}
                        onChange={(e) => updateColumn(i(), 'pk', e.currentTarget.checked)}
                      />
                      PK
                    </label>
                    <label class="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={col.notNull}
                        onChange={(e) => updateColumn(i(), 'notNull', e.currentTarget.checked)}
                      />
                      NN
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => removeColumn(i())}
                  class="p-1 text-red-500 hover:bg-red-100 rounded mt-1"
                  title="Remove Column"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="pt-4 border-t">
        <button
          onClick={() => createTableMutation.mutate()}
          disabled={!tableName() || columns().length === 0 || createTableMutation.isPending}
          class="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          Create Table
        </button>
      </div>
    </div>
  );
};

export default CreateTableDialog;
