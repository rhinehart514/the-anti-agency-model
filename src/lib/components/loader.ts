import { ComponentType, lazy, Suspense, createElement } from 'react';
import { getComponent, getReactComponent } from './registry';
import { PageSection, SectionStyles } from './types';

// Loading fallback component
function SectionLoading() {
  return createElement(
    'div',
    {
      className:
        'animate-pulse bg-muted rounded-lg h-32 w-full flex items-center justify-center',
    },
    createElement('span', { className: 'text-muted-foreground' }, 'Loading...')
  );
}

// Error fallback component
function SectionError({ componentId }: { componentId: string }) {
  return createElement(
    'div',
    {
      className:
        'bg-destructive/10 border border-destructive rounded-lg p-4 text-center',
    },
    createElement(
      'p',
      { className: 'text-destructive font-medium' },
      `Component "${componentId}" not found`
    ),
    createElement(
      'p',
      { className: 'text-destructive/80 text-sm mt-1' },
      'This component may have been removed or is not registered.'
    )
  );
}

// Render a single section
export function renderSection(
  section: PageSection,
  isEditing?: boolean
): React.ReactNode {
  const Component = getReactComponent(section.componentId);

  if (!Component) {
    return createElement(SectionError, {
      componentId: section.componentId,
      key: section.id,
    });
  }

  const sectionStyles = buildSectionStyles(section.styles);

  return createElement(
    'section',
    {
      key: section.id,
      id: `section-${section.id}`,
      className: `relative ${sectionStyles.className}`,
      style: sectionStyles.style,
      'data-section-id': section.id,
      'data-component-id': section.componentId,
    },
    createElement(Component, {
      ...section.props,
      __sectionId: section.id,
      __isEditing: isEditing,
    })
  );
}

// Render multiple sections
export function renderSections(
  sections: PageSection[],
  isEditing?: boolean
): React.ReactNode[] {
  // Sort by order index
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  return sorted.map((section) => renderSection(section, isEditing));
}

// Build CSS styles from section styles
function buildSectionStyles(styles?: SectionStyles): {
  className: string;
  style: React.CSSProperties;
} {
  if (!styles) {
    return { className: '', style: {} };
  }

  const classNames: string[] = [];
  const style: React.CSSProperties = {};

  // Background color
  if (styles.backgroundColor) {
    style.backgroundColor = styles.backgroundColor;
  }

  // Text color
  if (styles.textColor) {
    style.color = styles.textColor;
  }

  // Padding
  if (styles.paddingTop) {
    style.paddingTop = styles.paddingTop;
  }
  if (styles.paddingBottom) {
    style.paddingBottom = styles.paddingBottom;
  }

  // Max width
  if (styles.maxWidth) {
    const maxWidthMap: Record<string, string> = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    };
    classNames.push(maxWidthMap[styles.maxWidth] || '');
    classNames.push('mx-auto');
  }

  // Custom classes
  if (styles.customClasses) {
    classNames.push(styles.customClasses);
  }

  return {
    className: classNames.filter(Boolean).join(' '),
    style,
  };
}

// Lazy load a component (for code splitting)
export function lazyLoadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
): ComponentType<any> {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: Record<string, unknown>) {
    return createElement(
      Suspense,
      { fallback: createElement(SectionLoading) },
      createElement(LazyComponent, props)
    );
  };
}

// Get component info for the builder UI
export function getComponentInfo(componentId: string) {
  const definition = getComponent(componentId);

  if (!definition) {
    return null;
  }

  return {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    thumbnail: definition.thumbnail,
    editableFields: definition.editableFields,
    defaultProps: definition.defaultProps,
  };
}

// Check if a section should be visible based on visibility settings
export function isSectionVisible(
  section: PageSection,
  context: { isMobile?: boolean } = {}
): boolean {
  const visibility = section.visibility;

  if (!visibility) {
    return true;
  }

  if (!visibility.visible) {
    return false;
  }

  // Check device-specific visibility
  if (context.isMobile !== undefined) {
    if (context.isMobile && visibility.mobile === false) {
      return false;
    }
    if (!context.isMobile && visibility.desktop === false) {
      return false;
    }
  }

  return true;
}

// Filter visible sections
export function getVisibleSections(
  sections: PageSection[],
  context: { isMobile?: boolean } = {}
): PageSection[] {
  return sections.filter((section) => isSectionVisible(section, context));
}
