// Main diagnosis exports
export { analyzeSite } from './analyzer';

// Types
export type {
  DiagnosisResult,
  DiagnosisOptions,
  DiagnosisCategory,
  CategoryScore,
  Issue,
  Opportunity,
  IssueSeverity,
  CheckResult,
} from './types';

export { scoreToGrade, generateIssueId } from './types';

// Individual checks (for testing)
export { checkPerformance } from './checks/performance';
export { checkMobile } from './checks/mobile';
export { checkSeo } from './checks/seo';
export { checkConversion } from './checks/conversion';
export { checkAccessibility } from './checks/accessibility';
export { checkSecurity } from './checks/security';
