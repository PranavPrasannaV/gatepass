import { type HTMLAttributes, useState, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  onSort?: (column: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  striped?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  sortColumn,
  sortDirection = "asc",
  striped = false,
  emptyMessage = "No data available",
  className = "",
  ...props
}: TableProps<T>) {
  const [internalSort, setInternalSort] = useState<{
    column: string;
    direction: "asc" | "desc";
  }>({ column: sortColumn ?? "", direction: sortDirection });

  const currentSort = sortColumn
    ? { column: sortColumn, direction: sortDirection }
    : internalSort;

  const handleSort = useCallback(
    (column: string) => {
      const newDirection =
        currentSort.column === column && currentSort.direction === "asc"
          ? "desc"
          : "asc";

      if (onSort) {
        onSort(column, newDirection);
      } else {
        setInternalSort({ column, direction: newDirection });
      }
    },
    [currentSort, onSort],
  );

  return (
    <div className={`overflow-x-auto rounded-lg border dark:border-gatepass-700 ${className}`}>
      <table className="w-full text-sm" {...props}>
        <thead>
          <tr className="border-b bg-gatepass-50 dark:border-gatepass-700 dark:bg-gatepass-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-medium text-gatepass-500 dark:text-gatepass-400
                  ${col.sortable ? "cursor-pointer select-none hover:text-gatepass-700 dark:hover:text-gatepass-200" : ""}
                  ${col.className ?? ""}`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  currentSort.column === col.key
                    ? currentSort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span className="inline-flex text-gatepass-400">
                      {currentSort.column === col.key ? (
                        currentSort.direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gatepass-500 dark:text-gatepass-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b last:border-b-0 dark:border-gatepass-700
                  ${striped && rowIdx % 2 === 1 ? "bg-gatepass-50/50 dark:bg-gatepass-800/30" : ""}
                  hover:bg-gatepass-50 dark:hover:bg-gatepass-800/50 transition-colors`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {col.render
                      ? col.render(row[col.key] as T[keyof T], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
