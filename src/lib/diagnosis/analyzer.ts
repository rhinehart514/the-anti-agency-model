import type {
  DiagnosisResult,
  DiagnosisOptions,
  CategoryScore,
  Issue,
  Opportunity,
  DiagnosisCategory,
} from './types';
import { scoreToGrade } from './types';
import { checkPerformance } from './checks/performance';
import { checkMobile } from './checks/mobile';
import { checkSeo } from './checks/seo';
import { checkConversion } from './checks/conversion';
import { checkAccessibility } from './checks/accessibility';
import { checkSecurity } from './checks/security';
import { logger } from '@/lib/logger';

const DEFAULT_OPTIONS: DiagnosisOptions = {
  timeout: 30000,
  skipCategories: [],
  detailed: true,
};

interface CheckRunner {
  category: DiagnosisCategory;
  check: (url: string, html: string) => Promise<{
    passed: boolean;
    score: number;
    weight: number;
    issues: Issue[];
    opportunities: Opportunity[];
    metadata?: Record<string, unknown>;
  }>;
}

const CHECKS: CheckRunner[] = [
  { category: 'performance', check: checkPerformance },
  { category: 'mobile', check: checkMobile },
  { category: 'seo', check: checkSeo },
  { category: 'conversion', check: checkConversion },
  { category: 'accessibility', check: checkAccessibility },
  { category: 'security', check: checkSecurity },
];

export async function analyzeSite(
  url: string,
  html: string,
  options: DiagnosisOptions = {}
): Promise<DiagnosisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  logger.info({ url }, 'Starting site diagnosis');

  // Run all checks in parallel
  const checksToRun = CHECKS.filter(
    (c) => !opts.skipCategories?.includes(c.category)
  );

  const results = await Promise.all(
    checksToRun.map(async ({ category, check }) => {
      try {
        const result = await check(url, html);
        return { category, result };
      } catch (error) {
        logger.error({ category, error }, 'Check failed');
        return {
          category,
          result: {
            passed: false,
            score: 50,
            weight: 10,
            issues: [],
            opportunities: [],
          },
        };
      }
    })
  );

  // Build category scores
  const categories: DiagnosisResult['categories'] = {
    performance: createCategoryScore('performance', results),
    mobile: createCategoryScore('mobile', results),
    seo: createCategoryScore('seo', results),
    conversion: createCategoryScore('conversion', results),
    accessibility: createCategoryScore('accessibility', results),
    security: createCategoryScore('security', results),
  };

  // Collect all issues and opportunities
  const allIssues: Issue[] = [];
  const allOpportunities: Opportunity[] = [];

  for (const { result } of results) {
    allIssues.push(...result.issues);
    allOpportunities.push(...result.opportunities);
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Sort opportunities by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allOpportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Calculate overall score (weighted average)
  let totalWeight = 0;
  let weightedScore = 0;

  for (const { result } of results) {
    weightedScore += result.score * result.weight;
    totalWeight += result.weight;
  }

  const overallScore = Math.round(totalWeight > 0 ? weightedScore / totalWeight : 0);
  const overallGrade = scoreToGrade(overallScore);

  // Generate summary
  const summary = generateSummary(overallScore, allIssues, categories);
  const recommendations = generateRecommendations(allIssues, allOpportunities);

  const duration = Date.now() - startTime;
  logger.info({ url, overallScore, duration }, 'Diagnosis completed');

  return {
    url,
    diagnosedAt: new Date(),
    overallScore,
    overallGrade,
    categories,
    issues: allIssues,
    opportunities: allOpportunities,
    summary,
    recommendations,
  };
}

function createCategoryScore(
  category: DiagnosisCategory,
  results: Array<{ category: DiagnosisCategory; result: { passed: boolean; score: number; weight: number; issues: Issue[]; opportunities: Opportunity[] } }>
): CategoryScore {
  const categoryResult = results.find((r) => r.category === category);

  if (!categoryResult) {
    return {
      score: 0,
      grade: 'F',
      issues: [],
      opportunities: [],
      summary: 'Check was skipped',
    };
  }

  const { result } = categoryResult;
  const grade = scoreToGrade(result.score);

  let summary: string;
  if (result.score >= 90) {
    summary = `Excellent ${category} implementation`;
  } else if (result.score >= 80) {
    summary = `Good ${category} with minor improvements needed`;
  } else if (result.score >= 70) {
    summary = `${capitalizeFirst(category)} needs some attention`;
  } else if (result.score >= 50) {
    summary = `${capitalizeFirst(category)} has significant issues`;
  } else {
    summary = `${capitalizeFirst(category)} requires immediate attention`;
  }

  return {
    score: result.score,
    grade,
    issues: result.issues,
    opportunities: result.opportunities,
    summary,
  };
}

function generateSummary(
  score: number,
  issues: Issue[],
  categories: DiagnosisResult['categories']
): string {
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  // Find weakest categories
  const categoryScores = Object.entries(categories)
    .map(([name, data]) => ({ name, score: data.score }))
    .sort((a, b) => a.score - b.score);

  const weakest = categoryScores.slice(0, 2).map((c) => c.name);

  let summary = '';

  if (score >= 90) {
    summary = 'Your site is performing well overall. ';
  } else if (score >= 70) {
    summary = 'Your site has a solid foundation but there\'s room for improvement. ';
  } else if (score >= 50) {
    summary = 'Your site has several issues that may be costing you customers. ';
  } else {
    summary = 'Your site has critical issues that need immediate attention. ';
  }

  if (criticalCount > 0) {
    summary += `Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} that should be fixed immediately. `;
  }

  if (warningCount > 0) {
    summary += `${warningCount} warning${warningCount > 1 ? 's' : ''} also identified. `;
  }

  if (weakest.length > 0 && categoryScores[0].score < 70) {
    summary += `Focus on improving ${weakest.join(' and ')} for the biggest impact.`;
  }

  return summary.trim();
}

function generateRecommendations(
  issues: Issue[],
  opportunities: Opportunity[]
): string[] {
  const recommendations: string[] = [];

  // Add recommendations based on critical issues
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  for (const issue of criticalIssues.slice(0, 3)) {
    recommendations.push(`Fix: ${issue.title} - ${issue.howWeFix}`);
  }

  // Add top opportunities
  const topOpportunities = opportunities.filter((o) => o.priority === 'high');
  for (const opp of topOpportunities.slice(0, 2)) {
    recommendations.push(`Opportunity: ${opp.title} - ${opp.potentialGain}`);
  }

  // If not enough recommendations, add warnings
  if (recommendations.length < 5) {
    const warnings = issues.filter((i) => i.severity === 'warning');
    for (const warning of warnings.slice(0, 5 - recommendations.length)) {
      recommendations.push(`Improve: ${warning.title}`);
    }
  }

  return recommendations.slice(0, 5);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export for testing
export { generateSummary, generateRecommendations };
