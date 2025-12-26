'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus, Search, Layout, MessageSquare, Users, Phone, Menu, BarChart, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  getComponentsGroupedByCategory,
  searchComponents,
  type ComponentDefinition,
  type ComponentCategory,
} from '@/lib/components';

interface ComponentLibraryProps {
  onAddComponent: (componentId: string) => void;
}

const CATEGORY_ICONS: Record<ComponentCategory, React.ReactNode> = {
  hero: <Layout className="h-4 w-4" />,
  features: <Zap className="h-4 w-4" />,
  testimonials: <MessageSquare className="h-4 w-4" />,
  pricing: <BarChart className="h-4 w-4" />,
  contact: <Phone className="h-4 w-4" />,
  footer: <Menu className="h-4 w-4" />,
  navigation: <Menu className="h-4 w-4" />,
  content: <Layout className="h-4 w-4" />,
  cta: <Zap className="h-4 w-4" />,
  gallery: <Layout className="h-4 w-4" />,
  form: <Layout className="h-4 w-4" />,
  stats: <BarChart className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  faq: <MessageSquare className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  hero: 'Hero',
  features: 'Features',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  contact: 'Contact',
  footer: 'Footer',
  navigation: 'Navigation',
  content: 'Content',
  cta: 'Call to Action',
  gallery: 'Gallery',
  form: 'Forms',
  stats: 'Statistics',
  team: 'Team',
  faq: 'FAQ',
};

function DraggableComponent({
  component,
  onAdd,
}: {
  component: ComponentDefinition;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${component.id}`,
    data: { componentId: component.id, type: 'new-component' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-sm transition-all',
        isDragging && 'opacity-50'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
        {component.thumbnail ? (
          <img
            src={component.thumbnail}
            alt={component.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-sm">
            {CATEGORY_ICONS[component.category]}
          </div>
        )}
      </div>

      {/* Info */}
      <h4 className="font-medium text-sm text-gray-900 truncate">
        {component.name}
      </h4>
      <p className="text-xs text-gray-500 truncate mt-0.5">
        {component.description}
      </p>

      {/* Add button (click alternative) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute top-2 right-2 p-1.5 bg-blue-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
        title="Add to page"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ComponentLibrary({ onAddComponent }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const groupedComponents = getComponentsGroupedByCategory();
  const searchResults = searchQuery ? searchComponents(searchQuery) : null;

  // Get categories that have components
  const categoriesWithComponents = Object.entries(groupedComponents)
    .filter(([_, components]) => components.length > 0)
    .map(([category]) => category as ComponentCategory);

  const renderComponents = (components: ComponentDefinition[]) => (
    <div className="grid grid-cols-1 gap-3">
      {components.map((component) => (
        <DraggableComponent
          key={component.id}
          component={component}
          onAdd={() => onAddComponent(component.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-gray-900 mb-3">Components</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {searchResults ? (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-3">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            {searchResults.length > 0 ? (
              renderComponents(searchResults)
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                No components found
              </p>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-white px-4 h-auto flex-wrap">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              {categoriesWithComponents.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {CATEGORY_LABELS[category]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="p-4 mt-0">
              {categoriesWithComponents.map((category) => (
                <div key={category} className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {CATEGORY_ICONS[category]}
                    {CATEGORY_LABELS[category]}
                  </h4>
                  {renderComponents(groupedComponents[category])}
                </div>
              ))}
            </TabsContent>

            {categoriesWithComponents.map((category) => (
              <TabsContent key={category} value={category} className="p-4 mt-0">
                {renderComponents(groupedComponents[category])}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </ScrollArea>
    </div>
  );
}

export default ComponentLibrary;
