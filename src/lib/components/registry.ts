import { ComponentType } from 'react';
import {
  ComponentDefinition,
  ComponentCategory,
  COMPONENT_CATEGORIES,
} from './types';

// Registry storage
const componentRegistry = new Map<string, ComponentDefinition>();

// Component registration
export function registerComponent<TProps extends Record<string, unknown>>(
  definition: ComponentDefinition<TProps>
): void {
  if (componentRegistry.has(definition.id)) {
    console.warn(
      `Component "${definition.id}" is already registered. Overwriting.`
    );
  }

  componentRegistry.set(definition.id, definition as ComponentDefinition);
}

// Get a single component by ID
export function getComponent(id: string): ComponentDefinition | undefined {
  return componentRegistry.get(id);
}

// Get all registered components
export function getAllComponents(): ComponentDefinition[] {
  return Array.from(componentRegistry.values());
}

// Get components by category
export function getComponentsByCategory(
  category: ComponentCategory
): ComponentDefinition[] {
  return Array.from(componentRegistry.values()).filter(
    (c) => c.category === category
  );
}

// Get components grouped by category
export function getComponentsGroupedByCategory(): Record<
  ComponentCategory,
  ComponentDefinition[]
> {
  const grouped = {} as Record<ComponentCategory, ComponentDefinition[]>;

  for (const category of COMPONENT_CATEGORIES) {
    grouped[category] = [];
  }

  for (const component of componentRegistry.values()) {
    grouped[component.category].push(component);
  }

  return grouped;
}

// Search components
export function searchComponents(query: string): ComponentDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(componentRegistry.values()).filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Check if component exists
export function hasComponent(id: string): boolean {
  return componentRegistry.has(id);
}

// Get React component by ID
export function getReactComponent(
  id: string
): ComponentType<Record<string, unknown>> | null {
  const definition = componentRegistry.get(id);
  return definition?.component ?? null;
}

// Validate props against component schema
export function validateProps(
  componentId: string,
  props: Record<string, unknown>
): { success: boolean; data?: Record<string, unknown>; error?: string } {
  const definition = componentRegistry.get(componentId);

  if (!definition) {
    return { success: false, error: `Component "${componentId}" not found` };
  }

  const result = definition.schema.safeParse(props);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  return {
    success: false,
    error: result.error.errors.map((e) => e.message).join(', '),
  };
}

// Get default props for a component
export function getDefaultProps(
  componentId: string
): Record<string, unknown> | null {
  const definition = componentRegistry.get(componentId);
  return definition?.defaultProps ?? null;
}

// Create a new section instance
export function createSectionInstance(
  componentId: string,
  overrideProps?: Partial<Record<string, unknown>>
): {
  componentId: string;
  props: Record<string, unknown>;
} | null {
  const definition = componentRegistry.get(componentId);

  if (!definition) {
    return null;
  }

  return {
    componentId,
    props: {
      ...definition.defaultProps,
      ...overrideProps,
    },
  };
}

// Registry stats
export function getRegistryStats(): {
  total: number;
  byCategory: Record<ComponentCategory, number>;
  premium: number;
} {
  const stats = {
    total: componentRegistry.size,
    byCategory: {} as Record<ComponentCategory, number>,
    premium: 0,
  };

  for (const category of COMPONENT_CATEGORIES) {
    stats.byCategory[category] = 0;
  }

  for (const component of componentRegistry.values()) {
    stats.byCategory[component.category]++;
    if (component.isPremium) {
      stats.premium++;
    }
  }

  return stats;
}

// Clear registry (for testing)
export function clearRegistry(): void {
  componentRegistry.clear();
}

// Export registry for debugging
export function debugRegistry(): void {
  console.group('Component Registry');
  console.log('Total components:', componentRegistry.size);
  console.log('Components:', Array.from(componentRegistry.keys()));
  console.groupEnd();
}
