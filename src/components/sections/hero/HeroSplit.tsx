'use client';

import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

// Schema
export const HeroSplitSchema = z.object({
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
  image: z.object({
    src: z.string(),
    alt: z.string(),
  }),
  imagePosition: z.enum(['left', 'right']).default('right'),
  backgroundColor: z.string().optional(),
});

export type HeroSplitProps = z.infer<typeof HeroSplitSchema>;

interface HeroSplitComponentProps extends HeroSplitProps {
  __sectionId?: string;
  __isEditing?: boolean;
}

// Component
export function HeroSplit({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  image,
  imagePosition = 'right',
  backgroundColor = '#1e3a5f',
}: HeroSplitComponentProps) {
  const contentOrder = imagePosition === 'right' ? 'lg:order-1' : 'lg:order-2';
  const imageOrder = imagePosition === 'right' ? 'lg:order-2' : 'lg:order-1';

  return (
    <div
      className="relative min-h-[500px] lg:min-h-[600px] flex items-center"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className={`${contentOrder}`}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {headline}
            </h1>

            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
              {subheadline}
            </p>

            {(primaryCta || secondaryCta) && (
              <div className="flex flex-col sm:flex-row gap-4">
                {primaryCta && (
                  <Button
                    asChild
                    size="lg"
                    className="text-white px-8 py-6 text-lg"
                    style={{ backgroundColor: 'var(--color-accent-500, #f97316)' }}
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

          {/* Image */}
          <div className={`${imageOrder}`}>
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-2xl">
              {image.src ? (
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <span className="text-white/50 text-lg">Add an image</span>
                </div>
              )}
            </div>
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
  },
  {
    path: 'primaryCta.url',
    type: 'url',
    label: 'Primary Button URL',
  },
  {
    path: 'secondaryCta.text',
    type: 'text',
    label: 'Secondary Button Text',
  },
  {
    path: 'secondaryCta.url',
    type: 'url',
    label: 'Secondary Button URL',
  },
  {
    path: 'image.src',
    type: 'image',
    label: 'Hero Image',
  },
  {
    path: 'image.alt',
    type: 'text',
    label: 'Image Alt Text',
  },
  {
    path: 'imagePosition',
    type: 'select',
    label: 'Image Position',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
  },
  {
    path: 'backgroundColor',
    type: 'color',
    label: 'Background Color',
  },
];

// Register component
registerComponent({
  id: 'hero-split',
  category: 'hero',
  name: 'Split Hero',
  description: 'A hero section with content on one side and an image on the other',
  thumbnail: '/components/hero-split.png',
  schema: HeroSplitSchema,
  defaultProps: {
    headline: 'Transform Your Business',
    subheadline: 'Powerful tools and features to help you grow. Start building your dream platform today.',
    primaryCta: {
      text: 'Get Started',
      url: '#contact',
    },
    secondaryCta: {
      text: 'Watch Demo',
      url: '#demo',
    },
    image: {
      src: '',
      alt: 'Hero image',
    },
    imagePosition: 'right',
    backgroundColor: '#1e3a5f',
  },
  component: HeroSplit,
  editableFields,
  tags: ['hero', 'landing', 'split', 'image'],
});

export default HeroSplit;
