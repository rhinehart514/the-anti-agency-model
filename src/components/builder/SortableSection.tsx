'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PageSection } from '@/lib/components/types';
import { getComponent, getReactComponent } from '@/lib/components/registry';

interface SortableSectionProps {
  section: PageSection;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

export function SortableSection({
  section,
  isSelected,
  onSelect,
  onDelete,
  children,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const componentDef = getComponent(section.componentId);
  const Component = getReactComponent(section.componentId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onSelect}
    >
      {/* Section Controls */}
      <div
        className={cn(
          'absolute top-2 left-2 z-20 flex items-center gap-1 bg-card rounded-md shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-2 hover:bg-muted cursor-grab active:cursor-grabbing rounded-l-md"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Component Name */}
        <span className="px-2 text-sm font-medium text-foreground">
          {componentDef?.name || section.componentId}
        </span>

        {/* Settings */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="p-2 hover:bg-muted"
          title="Edit section"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 hover:bg-red-500/10 rounded-r-md"
          title="Delete section"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
        </button>
      </div>

      {/* Section Content */}
      <div className="relative">
        {Component ? (
          <Component {...section.props} __sectionId={section.id} __isEditing={true} />
        ) : (
          <div className="p-8 bg-muted text-center text-muted-foreground">
            Component "{section.componentId}" not found
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default SortableSection;
