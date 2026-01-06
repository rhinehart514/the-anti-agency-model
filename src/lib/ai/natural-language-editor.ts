import { getGroqClient, DEFAULT_MODEL } from './client';
import {
  NATURAL_LANGUAGE_EDITOR_PROMPT,
  EditOperation,
  NaturalLanguageEditResponse,
  RiskLevel,
} from './prompts';

export interface PageSection {
  id: string;
  componentId: string;
  props: Record<string, unknown>;
}

export interface PageContent {
  sections: PageSection[];
  siteInfo?: Record<string, unknown>;
  branding?: Record<string, unknown>;
}

export interface EditRequest {
  request: string;
  pageContent: PageContent;
  siteContext?: {
    siteName?: string;
    industry?: string;
  };
}

export interface EditResult {
  success: boolean;
  response?: NaturalLanguageEditResponse;
  updatedContent?: PageContent;
  error?: string;
}

/**
 * Interprets a natural language edit request and returns proposed changes
 */
export async function interpretEditRequest(
  editRequest: EditRequest
): Promise<EditResult> {
  const groq = getGroqClient();

  if (!groq) {
    return {
      success: false,
      error: 'AI service not configured. Please set GROQ_API_KEY.',
    };
  }

  try {
    const userPrompt = `
## Current Page Structure
${JSON.stringify(editRequest.pageContent, null, 2)}

${editRequest.siteContext ? `## Site Context
- Site Name: ${editRequest.siteContext.siteName || 'Unknown'}
- Industry: ${editRequest.siteContext.industry || 'General'}` : ''}

## User Request
"${editRequest.request}"

Please interpret this request and provide the JSON operations to fulfill it.
`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: NATURAL_LANGUAGE_EDITOR_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent output
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return {
        success: false,
        error: 'No response from AI service',
      };
    }

    // Parse the JSON response
    let parsed: NaturalLanguageEditResponse;
    try {
      // Extract JSON from response (in case of markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI response: ${parseError}`,
      };
    }

    // If AI didn't understand, return the response without applying
    if (!parsed.understood) {
      return {
        success: true,
        response: parsed,
      };
    }

    // Apply operations to get preview of updated content
    const updatedContent = applyOperations(
      editRequest.pageContent,
      parsed.operations
    );

    return {
      success: true,
      response: parsed,
      updatedContent,
    };
  } catch (error) {
    return {
      success: false,
      error: `AI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Apply edit operations to page content
 */
export function applyOperations(
  content: PageContent,
  operations: EditOperation[]
): PageContent {
  // Deep clone to avoid mutations
  const result: PageContent = JSON.parse(JSON.stringify(content));

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'update':
          applyUpdate(result, op);
          break;
        case 'add_section':
          applyAddSection(result, op);
          break;
        case 'remove_section':
          applyRemoveSection(result, op);
          break;
        case 'reorder':
          applyReorder(result, op);
          break;
        case 'add_item':
          applyAddItem(result, op);
          break;
        case 'remove_item':
          applyRemoveItem(result, op);
          break;
        case 'update_item':
          applyUpdateItem(result, op);
          break;
      }
    } catch (error) {
      console.error(`Failed to apply operation ${op.type}:`, error);
    }
  }

  return result;
}

function findSectionIndex(
  content: PageContent,
  op: EditOperation
): number {
  // If findSection is specified, find by componentId
  if (op.findSection) {
    return content.sections.findIndex(
      (s) => s.componentId === op.findSection
    );
  }
  return op.sectionIndex ?? -1;
}

function applyUpdate(content: PageContent, op: EditOperation): void {
  const sectionIndex = findSectionIndex(content, op);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return;

  const section = content.sections[sectionIndex];
  if (!op.path) return;

  // Parse path like "props.headline" or "props.features[0].title"
  setNestedValue(section, op.path, op.value);
}

function applyAddSection(content: PageContent, op: EditOperation): void {
  if (!op.componentId) return;

  const newSection: PageSection = {
    id: `section-${Date.now()}`,
    componentId: op.componentId,
    props: (op.props || {}) as Record<string, unknown>,
  };

  const position = op.position ?? content.sections.length;
  content.sections.splice(position, 0, newSection);
}

function applyRemoveSection(content: PageContent, op: EditOperation): void {
  const sectionIndex = findSectionIndex(content, op);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return;

  content.sections.splice(sectionIndex, 1);
}

function applyReorder(content: PageContent, op: EditOperation): void {
  if (op.fromIndex === undefined || op.toIndex === undefined) return;
  if (op.fromIndex < 0 || op.fromIndex >= content.sections.length) return;

  const [section] = content.sections.splice(op.fromIndex, 1);
  content.sections.splice(op.toIndex, 0, section);
}

function applyAddItem(content: PageContent, op: EditOperation): void {
  const sectionIndex = findSectionIndex(content, op);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return;
  if (!op.path || !op.value) return;

  const section = content.sections[sectionIndex];
  const array = getNestedValue(section, op.path);

  if (Array.isArray(array)) {
    array.push(op.value);
  }
}

function applyRemoveItem(content: PageContent, op: EditOperation): void {
  const sectionIndex = findSectionIndex(content, op);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return;
  if (!op.path || op.itemIndex === undefined) return;

  const section = content.sections[sectionIndex];
  const array = getNestedValue(section, op.path);

  if (Array.isArray(array) && op.itemIndex < array.length) {
    array.splice(op.itemIndex, 1);
  }
}

function applyUpdateItem(content: PageContent, op: EditOperation): void {
  const sectionIndex = findSectionIndex(content, op);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return;
  if (!op.path || op.itemIndex === undefined || !op.field) return;

  const section = content.sections[sectionIndex];
  const array = getNestedValue(section, op.path);

  if (Array.isArray(array) && op.itemIndex < array.length) {
    const item = array[op.itemIndex];
    if (item && typeof item === 'object') {
      (item as Record<string, unknown>)[op.field] = op.value;
    }
  }
}

// Utility functions for nested object access
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function setNestedValue(obj: unknown, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current === null || current === undefined) return;
    if (typeof current !== 'object') return;

    const record = current as Record<string, unknown>;
    if (!(part in record)) {
      record[part] = {};
    }
    current = record[part];
  }

  if (current && typeof current === 'object') {
    const lastPart = parts[parts.length - 1];
    (current as Record<string, unknown>)[lastPart] = value;
  }
}

/**
 * Generate a diff summary for display
 */
export function generateDiffSummary(
  original: PageContent,
  updated: PageContent
): string[] {
  const changes: string[] = [];

  // Compare section counts
  if (original.sections.length !== updated.sections.length) {
    const diff = updated.sections.length - original.sections.length;
    if (diff > 0) {
      changes.push(`Added ${diff} section(s)`);
    } else {
      changes.push(`Removed ${Math.abs(diff)} section(s)`);
    }
  }

  // Compare section contents
  const minLen = Math.min(original.sections.length, updated.sections.length);
  for (let i = 0; i < minLen; i++) {
    const origSection = original.sections[i];
    const updSection = updated.sections[i];

    if (JSON.stringify(origSection.props) !== JSON.stringify(updSection.props)) {
      changes.push(`Modified ${updSection.componentId} section`);
    }
  }

  return changes;
}

/**
 * Validate that operations are safe to apply
 */
export function validateOperations(
  operations: EditOperation[],
  riskLevel: RiskLevel
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Count destructive operations
  const removeOps = operations.filter(
    (op) => op.type === 'remove_section' || op.type === 'remove_item'
  );

  if (removeOps.length > 2 && riskLevel !== 'high') {
    warnings.push(
      `This operation removes ${removeOps.length} items. Please confirm.`
    );
  }

  // Check for core section removal
  const removedSections = operations
    .filter((op) => op.type === 'remove_section')
    .map((op) => op.sectionIndex);

  if (removedSections.includes(0)) {
    warnings.push('This will remove the hero section. Please confirm.');
  }

  return {
    valid: true,
    warnings,
  };
}
