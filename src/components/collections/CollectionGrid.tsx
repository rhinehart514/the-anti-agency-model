'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  SortAsc,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  ChevronDown,
  Columns,
} from 'lucide-react';
import type {
  Collection,
  CollectionField,
  CollectionRecord,
  CollectionView,
} from '@/lib/collections';

interface CollectionGridProps {
  collection: Collection;
  fields: CollectionField[];
  records: CollectionRecord[];
  view?: CollectionView;
  onCreateRecord: () => void;
  onEditRecord: (record: CollectionRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onDuplicateRecord: (record: CollectionRecord) => void;
  onUpdateCell: (recordId: string, fieldSlug: string, value: unknown) => void;
}

export function CollectionGrid({
  collection,
  fields,
  records,
  view,
  onCreateRecord,
  onEditRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onUpdateCell,
}: CollectionGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    fieldSlug: string;
  } | null>(null);

  // Sort fields by order
  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.orderIndex - b.orderIndex),
    [fields]
  );

  // Filter hidden fields based on view
  const visibleFields = useMemo(() => {
    if (!view?.hiddenFields?.length) return sortedFields;
    return sortedFields.filter((f) => !view.hiddenFields.includes(f.slug));
  }, [sortedFields, view?.hiddenFields]);

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const query = searchQuery.toLowerCase();
    return records.filter((record) =>
      Object.values(record.data).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [records, searchQuery]);

  const handleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const renderCellValue = (field: CollectionField, value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    switch (field.type) {
      case 'boolean':
        return (
          <div
            className={cn(
              'w-4 h-4 rounded border',
              value ? 'bg-green-500 border-green-600' : 'bg-gray-100 border-gray-300'
            )}
          />
        );

      case 'date':
      case 'datetime':
        return new Date(value as string).toLocaleDateString();

      case 'currency':
        const config = field.config as { currency?: string };
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: config.currency || 'USD',
        }).format(value as number);

      case 'select':
        const selectConfig = field.config as { options?: { value: string; label: string; color?: string }[] };
        const option = selectConfig.options?.find((o) => o.value === value);
        return option ? (
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: option.color ? `${option.color}20` : '#e5e7eb',
              color: option.color || '#374151',
            }}
          >
            {option.label}
          </span>
        ) : (
          String(value)
        );

      case 'multiselect':
        const multiConfig = field.config as { options?: { value: string; label: string; color?: string }[] };
        const values = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1">
            {values.map((v) => {
              const opt = multiConfig.options?.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: opt?.color ? `${opt.color}20` : '#e5e7eb',
                    color: opt?.color || '#374151',
                  }}
                >
                  {opt?.label || v}
                </span>
              );
            })}
          </div>
        );

      case 'url':
        return (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block max-w-xs"
          >
            {value as string}
          </a>
        );

      case 'email':
        return (
          <a
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline"
          >
            {value as string}
          </a>
        );

      case 'image':
        return value ? (
          <img
            src={value as string}
            alt=""
            className="w-8 h-8 rounded object-cover"
          />
        ) : null;

      default:
        return <span className="truncate max-w-xs block">{String(value)}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort
          </Button>
          <Button variant="outline" size="sm">
            <Columns className="h-4 w-4 mr-2" />
            Fields
          </Button>
        </div>

        <Button onClick={onCreateRecord}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredRecords.length > 0 &&
                    selectedRecords.size === filteredRecords.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              {visibleFields.map((field) => (
                <TableHead key={field.id} className="font-medium">
                  <div className="flex items-center gap-2">
                    {field.name}
                    {field.isRequired && (
                      <span className="text-red-500">*</span>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleFields.length + 2}
                  className="text-center py-12 text-gray-500"
                >
                  {searchQuery ? (
                    <div>
                      <p>No records match your search</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p>No records yet</p>
                      <Button onClick={onCreateRecord} className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first record
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow
                  key={record.id}
                  className={cn(
                    'hover:bg-gray-50',
                    selectedRecords.has(record.id) && 'bg-blue-50'
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  {visibleFields.map((field) => (
                    <TableCell
                      key={field.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setEditingCell({
                          recordId: record.id,
                          fieldSlug: field.slug,
                        })
                      }
                    >
                      {renderCellValue(field, record.data[field.slug])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditRecord(record)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicateRecord(record)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onDeleteRecord(record.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-sm text-gray-600">
        <span>
          {selectedRecords.size > 0
            ? `${selectedRecords.size} of ${filteredRecords.length} selected`
            : `${filteredRecords.length} records`}
        </span>
        <span>
          {searchQuery && `Filtered from ${records.length} total`}
        </span>
      </div>
    </div>
  );
}

export default CollectionGrid;
