import React from 'react';

export interface Column<T> {
  header: string;
  accessor: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-stone-500 bg-white border border-[#D1B370]/50 rounded-xl">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#D1B370]/60 rounded-xl bg-white shadow-xs">
      <table className="w-full text-left text-sm text-stone-800">
        <thead className="bg-[#FAF7EE] text-xs uppercase tracking-wider text-[#A76D40] border-b border-[#D1B370]/60 font-bold">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`py-3.5 px-4 font-bold ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D1B370]/30 font-medium">
          {data.map((item, rowIdx) => (
            <tr
              key={keyExtractor(item, rowIdx)}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors duration-100 ${
                onRowClick ? 'cursor-pointer hover:bg-[#F5F5DC]/50' : 'hover:bg-[#F5F5DC]/30'
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`py-3 px-4 ${col.className || ''}`}
                >
                  {col.accessor(item, rowIdx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
