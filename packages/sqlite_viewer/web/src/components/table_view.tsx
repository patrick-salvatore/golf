import { Component, createMemo, For, Show, createSignal } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/solid-query';
import {
  createSolidTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/solid-table';
import { Loader2, Plus, Settings, Trash2 } from 'lucide-solid';
import Drawer from './drawer';
import SchemaEditor from './schema_editor';

type ColumnInfo = {

  name: string;
  type: string;
  pk: number;
};

const TableView: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Track specifically which cell is being edited
  const [editingCell, setEditingCell] = createSignal<{ rowId: string, colName: string } | null>(null);
  const [currentValue, setCurrentValue] = createSignal<string>('');
  const [isSchemaOpen, setIsSchemaOpen] = createSignal(false);

  const tableName = createMemo(() => params.name || "");

  // Fetch Schema
  const schemaQuery = useQuery(() => ({
    queryKey: ['schema', tableName()],
    queryFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}/schema`);
      if (!res.ok) throw new Error('Failed to fetch schema');
      return res.json() as Promise<ColumnInfo[]>;
    },
  }));

  // Fetch Data
  const dataQuery = useQuery(() => ({
    queryKey: ['data', tableName()],
    queryFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}/data?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json() as Promise<any[]>;
    },
  }));

  // Update Mutation
  const updateMutation = useMutation(() => ({
    mutationFn: async (payload: { pks: Record<string, any>; updates: Record<string, any> }) => {
      const res = await fetch(`/api/tables/${tableName()}/rows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update row');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data', tableName()] });
      setEditingCell(null);
    },
  }));

  // Create Mutation
  const createRowMutation = useMutation(() => ({
    mutationFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }), // Send empty data for default row
      });
      if (!res.ok) throw new Error('Failed to create row');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data', tableName()] });
    },
  }));

  const dropTableMutation = useMutation(() => ({
    mutationFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to drop table');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      navigate('/');
    },
  }));

  const saveCell = (row: any, colName: string, newValue: any) => {
    const pks: Record<string, any> = {};
    
    // Identify PKs
    schemaQuery.data?.filter((c: ColumnInfo) => c.pk).forEach((c: ColumnInfo) => {
      pks[c.name] = row[c.name];
    });

    if (Object.keys(pks).length === 0) {
      alert("Cannot edit table without Primary Key");
      setEditingCell(null);
      return;
    }

    // Only update if value changed
    if (String(row[colName]) === String(newValue)) {
      setEditingCell(null);
      return;
    }

    updateMutation.mutate({ pks, updates: { [colName]: newValue } });
  };

  const columns = createMemo<ColumnDef<any>[]>(() => {
    if (!schemaQuery.data) return [];
    
    return schemaQuery.data.map((col: ColumnInfo) => ({
      accessorKey: col.name,
      header: () => (
        <div class="flex items-center gap-1">
          <span>{col.name}</span>
          <span class="text-xs text-gray-400 font-normal">({col.type})</span>
          {col.pk ? <span class="text-xs text-yellow-500 font-bold">PK</span> : null}
        </div>
      ),
      cell: (info: any) => {
        const rowId = info.row.id;
        const colName = col.name;
        
        const isEditing = () => editingCell()?.rowId === rowId && editingCell()?.colName === colName;
        const value = info.getValue();

        return (
          <Show 
            when={isEditing()} 
            fallback={
              <div 
                class="px-2 py-1 -m-1 text-sm truncate max-w-[200px] cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300" 
                title={String(value)}
                onClick={() => {
                  setCurrentValue(String(value ?? ''));
                  setEditingCell({ rowId, colName });
                }}
              >
                {String(value ?? '') || <span class="text-gray-300 italic">null</span>}
              </div>
            }
          >
            <input
              ref={(el) => setTimeout(() => el.focus(), 0)} // Auto-focus hack for Solid
              class="w-full px-2 py-1 -m-1 border border-blue-500 rounded text-sm outline-none shadow-sm"
              value={currentValue()}
              onInput={(e) => setCurrentValue(e.currentTarget.value)}
              onBlur={() => saveCell(info.row.original, colName, currentValue())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur(); // Triggers save via onBlur
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
            />
          </Show>
        );
      },
    }));
  });

  const table = createSolidTable({
    get data() {
      return dataQuery.data || [];
    },
    get columns() {
      return columns();
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-800">{tableName()}</h2>
        <div class="flex items-center gap-4">
          <div class="text-sm text-gray-500">
            {dataQuery.data?.length ?? 0} rows (limited to 100)
          </div>
          <button
            onClick={() => setIsSchemaOpen(true)}
            class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings class="w-4 h-4" />
            Schema
          </button>
          <button
            onClick={() => {
                if (confirm(`Are you sure you want to drop table "${tableName()}"? This action cannot be undone.`)) {
                    dropTableMutation.mutate();
                }
            }}
            class="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded text-sm hover:bg-red-100 transition-colors shadow-sm"
          >
            <Trash2 class="w-4 h-4" />
            Drop
          </button>
          <button
            onClick={() => createRowMutation.mutate()}
            disabled={createRowMutation.isPending}
            class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            Add Row
          </button>
        </div>
      </div>

      <Drawer
        isOpen={isSchemaOpen()}
        onClose={() => setIsSchemaOpen(false)}
        title={`Schema: ${tableName()}`}
      >
        <SchemaEditor tableName={tableName()} />
      </Drawer>

      <Show when={schemaQuery.isLoading || dataQuery.isLoading}>
        <div class="flex items-center justify-center p-12">
          <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Show>

      <Show when={schemaQuery.isError || dataQuery.isError}>
        <div class="p-4 bg-red-50 text-red-700 rounded-md">
          Error loading table data.
        </div>
      </Show>

      <Show when={schemaQuery.data && dataQuery.data}>
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
          <table class="w-full border-collapse">
            <thead class="bg-gray-50">
              <For each={table.getHeaderGroups()}>
                {(headerGroup) => (
                  <tr>
                    <For each={headerGroup.headers}>
                      {(header) => (
                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-200">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <tr class="hover:bg-gray-50">
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <td class="border-b border-gray-100">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default TableView;

