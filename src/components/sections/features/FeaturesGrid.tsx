'use client';

import { z } from 'zod';
import { Zap, Shield, Users, FileText, Briefcase, Home, Scale, Star, Check, ArrowRight } from 'lucide-react';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

const FeatureSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().default('star'),
});

export const FeaturesGridSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  features: z.array(FeatureSchema),
  columns: z.enum(['2', '3', '4']).default('3'),
  backgroundColor: z.string().optional(),
});

export type FeaturesGridProps = z.infer<typeof FeaturesGridSchema>;

const iconMap: Record<string, React.ReactNode> = {
  zap: <Zap className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
  fileText: <FileText className="w-6 h-6" />,
  briefcase: <Briefcase className="w-6 h-6" />,
  home: <Home className="w-6 h-6" />,
  scale: <Scale className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  check: <Check className="w-6 h-6" />,
  arrow: <ArrowRight className="w-6 h-6" />,
};

export function FeaturesGrid({
  headline,
  subheadline,
  features,
  columns = '3',
  backgroundColor = '#ffffff',
}: FeaturesGridProps) {
  const gridCols = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-2 lg:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section
      className="py-16 lg:py-24"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {headline}
          </h2>
          {subheadline && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className={`grid ${gridCols[columns]} gap-8`}>
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-12 h-12 text-white rounded-lg flex items-center justify-center mb-4 transition-colors"
                style={{
                  backgroundColor: 'var(--color-primary-500, #2563eb)',
                }}
              >
                {iconMap[feature.icon] || <Star className="w-6 h-6" />}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const editableFields: EditableFieldDefinition[] = [
  {
    path: 'headline',
    type: 'text',
    label: 'Headline',
    validation: { required: true },
  },
  {
    path: 'subheadline',
    type: 'richtext',
    label: 'Subheadline',
  },
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
  {
    path: 'backgroundColor',
    type: 'color',
    label: 'Background Color',
  },
  {
    path: 'features',
    type: 'array',
    label: 'Features',
    itemFields: [
      { path: 'title', type: 'text', label: 'Title' },
      { path: 'description', type: 'richtext', label: 'Description' },
      {
        path: 'icon',
        type: 'select',
        label: 'Icon',
        options: [
          { label: 'Star', value: 'star' },
          { label: 'Shield', value: 'shield' },
          { label: 'Users', value: 'users' },
          { label: 'Zap', value: 'zap' },
          { label: 'Briefcase', value: 'briefcase' },
          { label: 'Check', value: 'check' },
          { label: 'Scale', value: 'scale' },
        ],
      },
    ],
  },
];

registerComponent({
  id: 'features-grid',
  category: 'features',
  name: 'Features Grid',
  description: 'A grid of feature cards with icons and descriptions',
  schema: FeaturesGridSchema,
  defaultProps: {
    headline: 'Why Choose Us',
    subheadline: 'Everything you need to succeed in one powerful platform',
    columns: '3',
    backgroundColor: '#ffffff',
    features: [
      { title: 'Easy to Use', description: 'Intuitive interface designed for everyone', icon: 'star' },
      { title: 'Secure', description: 'Enterprise-grade security for your data', icon: 'shield' },
      { title: 'Scalable', description: 'Grows with your business needs', icon: 'zap' },
    ],
  },
  component: FeaturesGrid,
  editableFields,
  tags: ['features', 'services', 'grid', 'cards'],
});

export default FeaturesGrid;
