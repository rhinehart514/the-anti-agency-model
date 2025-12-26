'use client';

import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

export const CTACenteredSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  primaryCta: z.object({
    text: z.string(),
    url: z.string(),
  }).optional(),
  secondaryCta: z.object({
    text: z.string(),
    url: z.string(),
  }).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.enum(['light', 'dark']).default('light'),
});

export type CTACenteredProps = z.infer<typeof CTACenteredSchema>;

export function CTACentered({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  backgroundColor = '#2563eb',
  textColor = 'light',
}: CTACenteredProps) {
  const isLight = textColor === 'light';

  return (
    <section
      className="py-16 lg:py-24"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4 text-center">
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 ${isLight ? 'text-white' : 'text-gray-900'}`}>
          {headline}
        </h2>

        {subheadline && (
          <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-8 ${isLight ? 'text-white/90' : 'text-gray-600'}`}>
            {subheadline}
          </p>
        )}

        {(primaryCta || secondaryCta) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {primaryCta && (
              <Button
                asChild
                size="lg"
                className={`px-8 py-6 text-lg ${isLight ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <a href={primaryCta.url}>{primaryCta.text}</a>
              </Button>
            )}
            {secondaryCta && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className={`px-8 py-6 text-lg ${isLight ? 'border-white text-white hover:bg-white/10' : 'border-gray-900 text-gray-900 hover:bg-gray-100'}`}
              >
                <a href={secondaryCta.url}>{secondaryCta.text}</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const editableFields: EditableFieldDefinition[] = [
  { path: 'headline', type: 'text', label: 'Headline', validation: { required: true } },
  { path: 'subheadline', type: 'richtext', label: 'Subheadline' },
  { path: 'primaryCta.text', type: 'text', label: 'Primary Button Text' },
  { path: 'primaryCta.url', type: 'url', label: 'Primary Button URL' },
  { path: 'secondaryCta.text', type: 'text', label: 'Secondary Button Text' },
  { path: 'secondaryCta.url', type: 'url', label: 'Secondary Button URL' },
  { path: 'backgroundColor', type: 'color', label: 'Background Color' },
  {
    path: 'textColor',
    type: 'select',
    label: 'Text Color',
    options: [
      { label: 'Light (for dark backgrounds)', value: 'light' },
      { label: 'Dark (for light backgrounds)', value: 'dark' },
    ],
  },
];

registerComponent({
  id: 'cta-centered',
  category: 'cta',
  name: 'Centered CTA',
  description: 'A bold call-to-action section with headline and buttons',
  schema: CTACenteredSchema,
  defaultProps: {
    headline: 'Ready to Get Started?',
    subheadline: 'Join thousands of satisfied customers and take your business to the next level.',
    primaryCta: {
      text: 'Start Free Trial',
      url: '#signup',
    },
    secondaryCta: {
      text: 'Contact Sales',
      url: '#contact',
    },
    backgroundColor: '#2563eb',
    textColor: 'light',
  },
  component: CTACentered,
  editableFields,
  tags: ['cta', 'call-to-action', 'conversion'],
});

export default CTACentered;
