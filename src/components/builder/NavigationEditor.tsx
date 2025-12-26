'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Plus,
  GripVertical,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import type { Page } from './PageList';

export interface NavItem {
  id: string;
  label: string;
  type: 'page' | 'url' | 'section';
  target: string; // page ID, URL, or section anchor
  openInNewTab?: boolean;
}

interface NavigationEditorProps {
  items: NavItem[];
  pages: Page[];
  onChange: (items: NavItem[]) => void;
}

interface SortableNavItemProps {
  item: NavItem;
  pages: Page[];
  onUpdate: (id: string, updates: Partial<NavItem>) => void;
  onDelete: (id: string) => void;
}

function SortableNavItem({ item, pages, onUpdate, onDelete }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTargetLabel = () => {
    if (item.type === 'page') {
      const page = pages.find((p) => p.id === item.target);
      return page ? `/${page.slug}` : '(Page not found)';
    }
    if (item.type === 'section') {
      return `#${item.target}`;
    }
    return item.target;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white border rounded-lg',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-3">
        <Input
          value={item.label}
          onChange={(e) => onUpdate(item.id, { label: e.target.value })}
          placeholder="Link label"
          className="h-9"
        />

        <div className="flex items-center gap-2">
          <Select
            value={item.type}
            onValueChange={(value) =>
              onUpdate(item.id, { type: value as NavItem['type'], target: '' })
            }
          >
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page">Page</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="section">Section</SelectItem>
            </SelectContent>
          </Select>

          {item.type === 'page' ? (
            <Select
              value={item.target}
              onValueChange={(value) => onUpdate(item.id, { target: value })}
            >
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : item.type === 'section' ? (
            <div className="flex items-center gap-1 flex-1">
              <span className="text-gray-400">#</span>
              <Input
                value={item.target}
                onChange={(e) => onUpdate(item.id, { target: e.target.value })}
                placeholder="section-id"
                className="h-9"
              />
            </div>
          ) : (
            <Input
              value={item.target}
              onChange={(e) => onUpdate(item.id, { target: e.target.value })}
              placeholder="https://..."
              className="h-9 flex-1"
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {item.type === 'url' && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              item.openInNewTab && 'text-blue-600'
            )}
            onClick={() => onUpdate(item.id, { openInNewTab: !item.openInNewTab })}
            title={item.openInNewTab ? 'Opens in new tab' : 'Opens in same tab'}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function NavigationEditor({ items, pages, onChange }: NavigationEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localItems, setLocalItems] = useState<NavItem[]>(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleAddItem = () => {
    const newItem: NavItem = {
      id: `nav-${Date.now()}`,
      label: 'New Link',
      type: 'page',
      target: pages[0]?.id || '',
    };
    setLocalItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<NavItem>) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    onChange(localItems);
    setIsOpen(false);
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      setLocalItems(items);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LinkIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Navigation</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Navigation</DialogTitle>
          <DialogDescription>
            Configure the navigation links for your site header.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {localItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No navigation items</p>
              <p className="text-xs">Click "Add Link" to create one</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localItems.map((item) => (
                    <SortableNavItem
                      key={item.id}
                      item={item}
                      pages={pages}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="w-full mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Navigation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NavigationEditor;
