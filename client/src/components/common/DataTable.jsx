import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export const DataTable = ({
  columns = [], // [{ key, label, render, sortable, align, width, headerClassName, cellClassName }]
  data = [],
  keyField = 'id',
  loading = false,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters to find what you are looking for.',
  emptyActionLabel,
  onEmptyAction,
  emptyActionIcon,
  emptyActionDisabled = false,
  onRowClick,
  rowClassName,
  stickyHeader = true,
  className = '',
  tableClassName = '',
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={pageSize} columns={columns.length} />;
  }

  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col ${className}`}>
      <div className="overflow-x-auto w-full">
        <table className={`w-full text-left text-sm border-collapse ${tableClassName}`}>
          <thead className={`bg-[#F9FAFB] border-b border-[#E5E7EB] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col, idx) => {
                const isSorted = sortConfig.key === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right justify-end'
                    : col.align === 'center'
                    ? 'text-center justify-center'
                    : 'text-left justify-start';

                return (
                  <th
                    key={col.key || idx}
                    style={{ width: col.width }}
                    className={`
                      px-4 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider select-none
                      ${col.sortable ? 'cursor-pointer hover:bg-gray-100/80 transition-colors' : ''}
                      ${col.headerClassName || ''}
                    `}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${alignClass} w-full`}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#E53935]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#E53935]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    actionIcon={emptyActionIcon}
                    actionDisabled={emptyActionDisabled}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const isClickable = !!onRowClick;
                const customRowClass =
                  typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : rowClassName || '';

                return (
                  <tr
                    key={row[keyField] || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`
                      transition-colors duration-100 hover:bg-gray-50/80
                      ${isClickable ? 'cursor-pointer' : ''}
                      ${customRowClass}
                    `}
                  >
                    {columns.map((col, colIdx) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      const cellValue = row[col.key];

                      return (
                        <td
                          key={col.key || colIdx}
                          className={`
                            px-4 py-3 text-xs sm:text-sm text-[#1F2937] whitespace-nowrap
                            ${alignClass}
                            ${col.cellClassName || ''}
                          `}
                        >
                          {col.render ? col.render(cellValue, row, rowIdx) : cellValue !== undefined && cellValue !== null ? String(cellValue) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
};
