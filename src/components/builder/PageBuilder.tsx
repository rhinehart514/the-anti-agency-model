'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Eye, Save, Undo2, Redo2, Settings2, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComponentLibrary } from './ComponentLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { SortableSection } from './SortableSection';
import { ThemeSelector } from './ThemeSelector';
import {
  type PageSection,
  createSectionInstance,
  getComponent,
  getReactComponent,
} from '@/lib/components';
import {
  Theme,
  ThemeProvider,
  defaultTheme,
  generateThemeVars,
} from '@/lib/themes';

// Import sections to register them
import '@/components/sections';

interface PageBuilderProps {
  initialSections?: PageSection[];
  initialTheme?: Theme;
  onSave?: (sections: PageSection[], theme: Theme) => void;
  pageTitle?: string;
  siteSlug?: string;
}

function generateId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function PageBuilder({
  initialSections = [],
  initialTheme = defaultTheme,
  onSave,
  pageTitle = 'Untitled Page',
  siteSlug,
}: PageBuilderProps) {
  // State
  const [sections, setSections] = useState<PageSection[]>(initialSections);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get selected section
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  // Handlers
  const handleAddComponent = useCallback((componentId: string) => {
    const instance = createSectionInstance(componentId);
    if (!instance) return;

    const newSection: PageSection = {
      id: generateId(),
      componentId: instance.componentId,
      orderIndex: sections.length,
      props: instance.props,
    };

    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setHasUnsavedChanges(true);
  }, [sections.length]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      // Reindex
      return filtered.map((s, i) => ({ ...s, orderIndex: i }));
    });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    setHasUnsavedChanges(true);
  }, [selectedSectionId]);

  const handleUpdateProps = useCallback(
    (sectionId: string, props: Record<string, unknown>) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, props } : s))
      );
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over) return;

    // Check if dragging from library
    const activeData = active.data.current;
    if (activeData?.type === 'new-component') {
      // Adding new component
      handleAddComponent(activeData.componentId);
      return;
    }

    // Reordering existing sections
    if (active.id !== over.id) {
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return prev;

        const reordered = arrayMove(prev, oldIndex, newIndex);
        // Update order indices
        return reordered.map((s, i) => ({ ...s, orderIndex: i }));
      });
      setHasUnsavedChanges(true);
    }
  }, [handleAddComponent]);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave(sections, theme);
      setHasUnsavedChanges(false);
    }
  }, [sections, theme, onSave]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {siteSlug && (
            <a href={`/sites/${siteSlug}`} className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to site
            </a>
          )}
          <h1 className="font-semibold text-foreground">{pageTitle}</h1>
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Panel toggles */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLibrary(!showLibrary)}
            className={cn(!showLibrary && 'text-muted-foreground')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProperties(!showProperties)}
            className={cn(!showProperties && 'text-muted-foreground')}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Theme selector */}
          <ThemeSelector
            currentTheme={theme}
            onThemeChange={handleThemeChange}
          />

          <div className="w-px h-6 bg-border" />

          {/* Preview toggle */}
          <Button
            variant={isPreviewMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Component Library */}
          {showLibrary && !isPreviewMode && (
            <div className="w-72 flex-shrink-0">
              <ComponentLibrary onAddComponent={handleAddComponent} />
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 overflow-auto">
            <div
              className={cn(
                'min-h-full',
                isPreviewMode ? 'bg-background' : 'bg-muted p-8'
              )}
            >
              <ThemeProvider theme={theme}>
                <div
                  className={cn(
                    isPreviewMode
                      ? ''
                      : 'bg-card rounded-lg shadow-sm overflow-hidden max-w-6xl mx-auto'
                  )}
                >
                  {sections.length === 0 ? (
                    <div className="min-h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg m-4">
                      <div className="text-center">
                        <p className="text-lg mb-2">No sections yet</p>
                        <p className="text-sm">
                          Drag components from the library or click to add
                        </p>
                      </div>
                    </div>
                  ) : (
                    <SortableContext
                      items={sections.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sections.map((section) =>
                        isPreviewMode ? (
                          // Preview mode - just render component
                          <div key={section.id}>
                            {(() => {
                              const Component = getReactComponent(section.componentId);
                              return Component ? (
                                <Component {...section.props} />
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          // Edit mode - sortable wrapper
                          <SortableSection
                            key={section.id}
                            section={section}
                            isSelected={selectedSectionId === section.id}
                            onSelect={() => setSelectedSectionId(section.id)}
                            onDelete={() => handleDeleteSection(section.id)}
                          />
                        )
                      )}
                    </SortableContext>
                  )}
                </div>
              </ThemeProvider>
            </div>
          </div>

          {/* Properties Panel */}
          {showProperties && !isPreviewMode && (
            <PropertiesPanel
              selectedSection={selectedSection}
              onUpdateProps={handleUpdateProps}
              onClose={() => setSelectedSectionId(null)}
            />
          )}
        </DndContext>
      </div>
    </div>
  );
}

export default PageBuilder;
