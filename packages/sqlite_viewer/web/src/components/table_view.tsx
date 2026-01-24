import { Component, createMemo, For, Show, createSignal } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import {
  createSolidTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/solid-table";
import { Loader2, Plus, Settings, Trash2 } from "lucide-solid";
import Drawer from "./drawer";
import SchemaEditor from "./schema_editor";

type ColumnInfo = {
  name: string;
  type: string;
  pk: number;
};

const getInputType = (sqlType: string): string => {
  const t = sqlType.toUpperCase();
  if (
    t.includes("INT") ||
    t.includes("REAL") ||
    t.includes("NUMERIC") ||
    t.includes("DECIMAL") ||
    t.includes("FLOAT") ||
    t.includes("DOUBLE")
  )
    return "number";
  if (t.includes("BOOL")) return "checkbox";
  if (t.includes("DATETIME") || t.includes("TIMESTAMP"))
    return "datetime-local";
  if (t.includes("DATE")) return "date";
  return "text";
};

const TableView: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newRow, setNewRow] = createSignal<any | null>(null);
  const [editingCell, setEditingCell] = createSignal<{
    rowId: string;
    colName: string;
  } | null>(null);
  const [currentValue, setCurrentValue] = createSignal<string>("");
  const [isSchemaOpen, setIsSchemaOpen] = createSignal(false);

  const tableName = createMemo(() => params.name || "");

  // Fetch Schema
  const schemaQuery = useQuery(() => ({
    queryKey: ["schema", tableName()],
    queryFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}/schema`);
      if (!res.ok) throw new Error("Failed to fetch schema");
      return res.json() as Promise<ColumnInfo[]>;
    },
  }));

  // Fetch Data
  const dataQuery = useQuery(() => ({
    queryKey: ["data", tableName()],
    queryFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}/data?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json() as Promise<any[]>;
    },
  }));

  // Update Mutation
  const updateMutation = useMutation(() => ({
    mutationFn: async (payload: {
      pks: Record<string, any>;
      updates: Record<string, any>;
    }) => {
      const res = await fetch(`/api/tables/${tableName()}/rows`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update row");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", tableName()] });
      setEditingCell(null);
    },
  }));

  // Create Mutation
  const createRowMutation = useMutation(() => ({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch(`/api/tables/${tableName()}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create row");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", tableName()] });
      setNewRow(null);
    },
    onError: (err: any) => {
      return err.message || "Failed to create row";
    },
  }));

  // Delete Mutation
  const deleteRowMutation = useMutation(() => ({
    mutationFn: async (row: any) => {
      if (!schemaQuery.data) {
        throw new Error("No schema loaded");
      }

      // Build query string from PKs
      const pkCols = schemaQuery.data.filter((c) => c.pk);
      if (pkCols.length === 0) {
        throw new Error("Cannot delete table without primary key");
      }
      const params = new URLSearchParams();
      pkCols.forEach((col) => {
        params.append(col.name, row[col.name]);
      });

      const res = await fetch(
        `/api/tables/${tableName()}/rows?${params.toString()}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete row");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", tableName()] });
    },
    onError: (err: any) => {
      return err.message || "Failed to delete row";
    },
  }));

  const dropTableMutation = useMutation(() => ({
    mutationFn: async () => {
      const res = await fetch(`/api/tables/${tableName()}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to drop table");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      navigate("/");
    },
  }));

  const isEditableTable = createMemo(() => {
    const pks: Record<string, any> = {};

    schemaQuery.data
      ?.filter((c: ColumnInfo) => c.pk)
      .forEach((c: ColumnInfo) => {
        pks[c.name] = true;
      });

    return Object.keys(pks).length;
  });

  const saveCell = (row: any, colName: string, newValue: any) => {
    if (row.__isNew) {
      row[colName] = newValue;

      // Commit create on first blur of any field
      const dataToCreate: Record<string, any> = {};

      schemaQuery.data?.forEach((c) => {
        if (row[c.name] !== "") {
          dataToCreate[c.name] = row[c.name];
        }
      });

      setNewRow({...row, ...dataToCreate});
      setEditingCell(null);
      return;
    }

    // -------- NORMAL UPDATE PATH --------

    const pks: Record<string, any> = {};

    schemaQuery.data
      ?.filter((c: ColumnInfo) => c.pk)
      .forEach((c: ColumnInfo) => {
        pks[c.name] = row[c.name];
      });

    if (Object.keys(pks).length === 0) {
      alert("Cannot edit table without Primary Key");
      setEditingCell(null);
      return;
    }

    if (String(row[colName]) === String(newValue)) {
      setEditingCell(null);
      return;
    }

    updateMutation.mutate({ pks, updates: { [colName]: newValue } });
  };

  const columns = createMemo<ColumnDef<any>[]>(() => {
    if (!schemaQuery.data) return [];

    const cols = schemaQuery.data.map((col: ColumnInfo) => ({
      accessorKey: col.name,
      header: () => (
        <div class="flex items-center gap-1">
          <span>{col.name}</span>
          <span class="text-xs text-gray-400 font-normal">({col.type})</span>
          {col.pk ? (
            <span class="text-xs text-yellow-500 font-bold">PK</span>
          ) : null}
        </div>
      ),
      cell: (info: any) => {
        const rowOriginal = info.row.original;
        const colName = col.name;
        const isPk = !!col.pk;

        const rowId = rowOriginal.__tempId ?? info.row.id;
        const isNewRow = !!rowOriginal.__isNew;

        const isEditing = () =>
          editingCell()?.rowId === rowId && editingCell()?.colName === colName;

        const value = info.getValue();

        if (isPk) {
          return (
            <div class="px-2 py-1 -m-1 text-sm text-gray-400 italic select-none">
              {isNewRow ? "auto" : String(value)}
            </div>
          );
        }

        if (!isEditableTable()) {
          return (
            <div
              class="px-2 py-1 -m-1 text-sm truncate max-w-[200px] cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              tabIndex={0}
              title={String(value)}
            >
              {String(value ?? "") || (
                <span class="text-gray-300 italic">
                  {isNewRow ? "click to set" : "null"}
                </span>
              )}
            </div>
          );
        }

        return (
          <Show
            when={isEditing()}
            fallback={
              <div
                class="px-2 py-1 -m-1 text-sm truncate max-w-[200px] cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={String(value)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setCurrentValue(String(value ?? ""));
                    setEditingCell({ rowId, colName });
                  }
                }}
                onClick={() => {
                  setCurrentValue(String(value ?? ""));
                  setEditingCell({ rowId, colName });
                }}
              >
                {String(value ?? "") || (
                  <span class="text-gray-300 italic">
                    {isNewRow ? "click to set" : "null"}
                  </span>
                )}
              </div>
            }
          >
            {(() => {
              const inputType = getInputType(col.type);
              if (inputType === "checkbox") {
                return (
                  <div class="flex items-center h-full">
                    <input
                      ref={(el) => setTimeout(() => el.focus(), 0)}
                      type="checkbox"
                      class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={
                        currentValue() == "1" || currentValue() == "true"
                      }
                      onChange={(e) =>
                        setCurrentValue(e.currentTarget.checked ? "1" : "0")
                      }
                      onBlur={() =>
                        saveCell(rowOriginal, colName, currentValue())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        else if (e.key === "Escape") {
                          setEditingCell(null);
                          if (isNewRow) setNewRow(null);
                        }
                      }}
                    />
                  </div>
                );
              }
              return (
                <input
                  ref={(el) => setTimeout(() => el.focus(), 0)}
                  type={inputType}
                  class="w-full px-2 py-1 -m-1 border border-blue-500 rounded text-sm outline-none shadow-sm"
                  value={
                    inputType === "datetime-local"
                      ? currentValue().replace(" ", "T")
                      : currentValue()
                  }
                  onInput={(e) => {
                    let val = e.currentTarget.value;
                    if (inputType === "datetime-local")
                      val = val.replace("T", " ");
                    setCurrentValue(val);
                  }}
                  onBlur={() => saveCell(rowOriginal, colName, currentValue())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    else if (e.key === "Escape") {
                      setEditingCell(null);
                      if (isNewRow) setNewRow(null);
                    }
                  }}
                />
              );
            })()}
          </Show>
        );
      },
    }));

    // Add actions column at the end
    cols.push({
      accessorKey: "actions",
      header: () => <span class="text-sm text-gray-400">Actions</span>,
      cell: (info: any) => {
        const row = info.row.original;
        const isNewRow = !!row.__isNew;

        return (
          <button
            class="p-1 text-red-500 hover:bg-red-100 rounded"
            title="Delete row"
            disabled={isNewRow}
            onClick={() => {
              if (confirm("Are you sure you want to delete this row?")) {
                deleteRowMutation.mutate(row);
              }
            }}
          >
            <Trash2 class="w-4 h-4" />
          </button>
        );
      },
    });

    return cols;
  });

  const rows = createMemo(() => {
    const rows = [...(dataQuery.data || [])];

    if (newRow()) {
      rows.push(newRow());
    }
    return rows;
  });

  const table = createSolidTable({
    get data() {
      return rows();
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
              if (
                confirm(
                  `Are you sure you want to drop table "${tableName()}"? This action cannot be undone.`,
                )
              ) {
                dropTableMutation.mutate();
              }
            }}
            class="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded text-sm hover:bg-red-100 transition-colors shadow-sm"
          >
            <Trash2 class="w-4 h-4" />
            Drop
          </button>
          <Show
            when={newRow()}
            fallback={
              <button
                onClick={() => {
                  const emptyRow: any = {
                    __isNew: true,
                    __tempId: crypto.randomUUID(),
                  };

                  schemaQuery.data?.forEach((c) => {
                    emptyRow[c.name] = "";
                  });

                  setNewRow(emptyRow);
                }}
                class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                Add Row
              </button>
            }
          >
            <button
              onClick={() => {
                createRowMutation.mutate(newRow());
              }}
              disabled={!newRow()}
              class="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              Save Row
            </button>
          </Show>
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

      <Show when={schemaQuery.data && (dataQuery.data || dataQuery.isSuccess)}>
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
                                header.getContext(),
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
                  <tr
                    class="hover:bg-gray-50"
                    classList={{ "bg-blue-50": row.original.__isNew }}
                  >
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <td class="border-b border-gray-100">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
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

      <Show
        when={
          createRowMutation.error ||
          dropTableMutation.error ||
          deleteRowMutation.error ||
          updateMutation.error
        }
      >
        <div class="p-3 bg-red-50 text-red-700 border border-red-200 rounded">
          {createRowMutation.error ||
            dropTableMutation.error ||
            deleteRowMutation.error ||
            updateMutation.error}
        </div>
      </Show>
    </div>
  );
};

export default TableView;
