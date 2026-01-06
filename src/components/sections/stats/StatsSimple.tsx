'use client';

import { z } from 'zod';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

export const StatsSimpleSchema = z.object({
  headline: z.string().optional(),
  stats: z.array(StatSchema),
  columns: z.enum(['2', '3', '4']).default('4'),
  backgroundColor: z.string().optional(),
  textColor: z.enum(['light', 'dark']).default('dark'),
});

export type StatsSimpleProps = z.infer<typeof StatsSimpleSchema>;

export function StatsSimple({
  headline,
  stats,
  columns = '4',
  backgroundColor = '#f8fafc',
  textColor = 'dark',
}: StatsSimpleProps) {
  const isLight = textColor === 'light';
  const gridCols = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 md:grid-cols-3',
    '4': 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <section
      className="py-16 lg:py-20"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        {headline && (
          <h2 className={`text-2xl md:text-3xl font-bold text-center mb-12 ${isLight ? 'text-white' : 'text-gray-900'}`}>
            {headline}
          </h2>
        )}

        <div className={`grid ${gridCols[columns]} gap-8`}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div
                className="text-4xl md:text-5xl font-bold mb-2"
                style={{ color: isLight ? 'white' : 'var(--color-primary-600, #2563eb)' }}
              >
                {stat.prefix}
                {stat.value}
                {stat.suffix}
              </div>
              <div className={`text-lg ${isLight ? 'text-white/80' : 'text-gray-600'}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const editableFields: EditableFieldDefinition[] = [
  { path: 'headline', type: 'text', label: 'Headline (optional)' },
  {
    path: 'columns',
    type: 'select',
    label: 'Columns',
    options: [
      { label: '2 Columns', value: '2' },
      { label: '3 Columns', value: '3' },
      { label: '4 Columns', value: '4' },
    ],
  },
  { path: 'backgroundColor', type: 'color', label: 'Background Color' },
  {
    path: 'textColor',
    type: 'select',
    label: 'Text Color',
    options: [
      { label: 'Dark', value: 'dark' },
      { label: 'Light (for dark backgrounds)', value: 'light' },
    ],
  },
  {
    path: 'stats',
    type: 'array',
    label: 'Statistics',
    itemFields: [
      { path: 'value', type: 'text', label: 'Value (e.g., 100, 50K)' },
      { path: 'label', type: 'text', label: 'Label' },
      { path: 'prefix', type: 'text', label: 'Prefix (e.g., $, +)' },
      { path: 'suffix', type: 'text', label: 'Suffix (e.g., %, +)' },
    ],
  },
];

registerComponent({
  id: 'stats-simple',
  category: 'stats',
  name: 'Simple Stats',
  description: 'A row of impressive statistics with numbers and labels',
  schema: StatsSimpleSchema,
  defaultProps: {
    headline: 'By the Numbers',
    columns: '4',
    backgroundColor: '#f8fafc',
    textColor: 'dark',
    stats: [
      { value: '500', suffix: '+', label: 'Happy Clients' },
      { value: '10', suffix: '+', label: 'Years Experience' },
      { value: '98', suffix: '%', label: 'Success Rate' },
      { value: '24/7', label: 'Support Available' },
    ],
  },
  component: StatsSimple,
  editableFields,
  tags: ['stats', 'numbers', 'metrics'],
});

export default StatsSimple;
