// Types
export * from './types';

// Registry
export {
  registerComponent,
  getComponent,
  getAllComponents,
  getComponentsByCategory,
  getComponentsGroupedByCategory,
  searchComponents,
  hasComponent,
  getReactComponent,
  validateProps,
  getDefaultProps,
  createSectionInstance,
  getRegistryStats,
  clearRegistry,
  debugRegistry,
} from './registry';

// Loader
export {
  renderSection,
  renderSections,
  lazyLoadComponent,
  getComponentInfo,
  isSectionVisible,
  getVisibleSections,
} from './loader';
