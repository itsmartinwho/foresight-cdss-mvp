'use client';
import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function RenderDetailTable({ title, dataArray, headers, columnAccessors }: {
  title: string;
  dataArray: Record<string, any>[];
  headers: string[];
  columnAccessors?: string[];
}) {
  const rows = Array.isArray(dataArray) ? dataArray : [];
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground/70 mt-1">No {title.toLowerCase()} data available</p>;
  }
  const displayHeaders = headers;
  const accessors = columnAccessors || headers.map(h => h.toLowerCase().replace(/\s+/g, ''));

  return (
    <div className="mt-2">
      <h4 className="text-lg font-medium text-foreground mb-2">{title}</h4>
      <Table className="text-xs mobile-card:block sm:table">
        <TableHeader className="mobile-card:hidden sm:table-header-group">
          <TableRow>
            {displayHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody className="mobile-card:block sm:table-row-group">
          {rows.map((item, index) => (
            <TableRow
              key={index}
              className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row"
            >
              {accessors.map((accessor, colIndex) => (
                <TableCell
                  key={accessor}
                  className="mobile-card:flex mobile-card:flex-col sm:table-cell"
                  data-column={displayHeaders[colIndex]}
                >
                  <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">{displayHeaders[colIndex]}: </span>
                  {item[accessor] !== undefined && item[accessor] !== null ? String(item[accessor]) : 'N/A'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 