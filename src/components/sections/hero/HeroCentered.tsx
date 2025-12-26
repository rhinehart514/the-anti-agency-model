'use client';

import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

// Schema
export const HeroCenteredSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  primaryCta: z
    .object({
      text: z.string(),
      url: z.string(),
    })
    .optional(),
  secondaryCta: z
    .object({
      text: z.string(),
      url: z.string(),
    })
    .optional(),
  backgroundType: z.enum(['theme', 'solid', 'gradient', 'image']).default('theme'),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
});

export type HeroCenteredProps = z.infer<typeof HeroCenteredSchema>;

interface HeroCenteredComponentProps extends HeroCenteredProps {
  __sectionId?: string;
  __isEditing?: boolean;
}

// Component
export function HeroCentered({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  backgroundType = 'theme',
  backgroundColor = '#1e3a5f',
  backgroundImage,
  textAlign = 'center',
}: HeroCenteredComponentProps) {
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (backgroundType) {
      case 'theme':
        return {
          backgroundColor: 'var(--color-primary-700, #1e3a5f)',
        };
      case 'image':
        return {
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}dd 100%)`,
        };
      case 'solid':
      default:
        return {
          backgroundColor: backgroundColor,
        };
    }
  };

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div className="relative min-h-[500px] lg:min-h-[600px] flex items-center">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={getBackgroundStyle()}
      >
        {/* Overlay for readability */}
        {backgroundType === 'image' && (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <div className={`container mx-auto px-4 py-16 lg:py-24 flex flex-col ${alignmentClasses[textAlign]}`}>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {headline}
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 leading-relaxed">
              {subheadline}
            </p>

            {(primaryCta || secondaryCta) && (
              <div className={`flex flex-col sm:flex-row gap-4 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'}`}>
                {primaryCta && (
                  <Button
                    asChild
                    size="lg"
                    className="px-8 py-6 text-lg text-white"
                    style={{
                      backgroundColor: 'var(--color-accent-500, #f97316)',
                    }}
                  >
                    <a href={primaryCta.url}>{primaryCta.text}</a>
                  </Button>
                )}
                {secondaryCta && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
                  >
                    <a href={secondaryCta.url}>{secondaryCta.text}</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Editable fields definition
const editableFields: EditableFieldDefinition[] = [
  {
    path: 'headline',
    type: 'text',
    label: 'Headline',
    placeholder: 'Enter your headline...',
    validation: { required: true },
  },
  {
    path: 'subheadline',
    type: 'richtext',
    label: 'Subheadline',
    placeholder: 'Enter your subheadline...',
  },
  {
    path: 'primaryCta.text',
    type: 'text',
    label: 'Primary Button Text',
    placeholder: 'Get Started',
  },
  {
    path: 'primaryCta.url',
    type: 'url',
    label: 'Primary Button URL',
    placeholder: '/contact',
  },
  {
    path: 'secondaryCta.text',
    type: 'text',
    label: 'Secondary Button Text',
    placeholder: 'Learn More',
  },
  {
    path: 'secondaryCta.url',
    type: 'url',
    label: 'Secondary Button URL',
    placeholder: '#about',
  },
  {
    path: 'backgroundType',
    type: 'select',
    label: 'Background Type',
    options: [
      { label: 'Use Theme Color', value: 'theme' },
      { label: 'Solid Color', value: 'solid' },
      { label: 'Gradient', value: 'gradient' },
      { label: 'Image', value: 'image' },
    ],
  },
  {
    path: 'backgroundColor',
    type: 'color',
    label: 'Background Color',
  },
  {
    path: 'backgroundImage',
    type: 'image',
    label: 'Background Image',
  },
  {
    path: 'textAlign',
    type: 'select',
    label: 'Text Alignment',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
  },
];

// Register component
registerComponent({
  id: 'hero-centered',
  category: 'hero',
  name: 'Centered Hero',
  description: 'A centered hero section with headline, subheadline, and call-to-action buttons',
  thumbnail: '/components/hero-centered.png',
  schema: HeroCenteredSchema,
  defaultProps: {
    headline: 'Welcome to Your Platform',
    subheadline: 'Build amazing websites and applications without writing code. Get started in minutes.',
    primaryCta: {
      text: 'Get Started',
      url: '#contact',
    },
    secondaryCta: {
      text: 'Learn More',
      url: '#features',
    },
    backgroundType: 'theme',
    backgroundColor: '#1e3a5f',
    textAlign: 'center',
  },
  component: HeroCentered,
  editableFields,
  tags: ['hero', 'landing', 'header'],
});

export default HeroCentered;
