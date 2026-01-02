import { z } from 'zod';

// Issue severity levels
export type IssueSeverity = 'critical' | 'warning' | 'info';

// Diagnosis categories
export type DiagnosisCategory =
  | 'performance'
  | 'mobile'
  | 'seo'
  | 'conversion'
  | 'accessibility'
  | 'security';

// Individual issue found during diagnosis
export interface Issue {
  id: string;
  category: DiagnosisCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  impact: string;
  howWeFix: string;
  technicalDetails?: string;
}

// Opportunity for improvement
export interface Opportunity {
  id: string;
  category: DiagnosisCategory;
  title: string;
  description: string;
  potentialGain: string;
  implementation: string;
  priority: 'high' | 'medium' | 'low';
}

// Score for a category
export interface CategoryScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: Issue[];
  opportunities: Opportunity[];
  summary: string;
}

// Full diagnosis result
export interface DiagnosisResult {
  url: string;
  diagnosedAt: Date;
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    performance: CategoryScore;
    mobile: CategoryScore;
    seo: CategoryScore;
    conversion: CategoryScore;
    accessibility: CategoryScore;
    security: CategoryScore;
  };
  issues: Issue[];
  opportunities: Opportunity[];
  summary: string;
  recommendations: string[];
}

// Diagnosis options
export interface DiagnosisOptions {
  timeout?: number;
  skipCategories?: DiagnosisCategory[];
  detailed?: boolean;
}

// Check result from individual checkers
export interface CheckResult {
  passed: boolean;
  score: number; // 0-100 contribution to category score
  weight: number; // How much this check contributes to final score
  issues: Issue[];
  opportunities: Opportunity[];
  metadata?: Record<string, unknown>;
}

// Check function type
export type CheckFunction = (
  url: string,
  html: string,
  options?: DiagnosisOptions
) => Promise<CheckResult>;

// Zod schemas for validation
export const IssueSchema = z.object({
  id: z.string(),
  category: z.enum(['performance', 'mobile', 'seo', 'conversion', 'accessibility', 'security']),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  howWeFix: z.string(),
  technicalDetails: z.string().optional(),
});

export const DiagnosisResultSchema = z.object({
  url: z.string().url(),
  diagnosedAt: z.date(),
  overallScore: z.number().min(0).max(100),
  overallGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  summary: z.string(),
});

// Helper to calculate grade from score
export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Helper to generate issue ID
export function generateIssueId(category: DiagnosisCategory, title: string): string {
  return `${category}-${title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`;
}
