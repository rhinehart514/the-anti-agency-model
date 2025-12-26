'use client';

import { z } from 'zod';
import { Quote } from 'lucide-react';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

const TestimonialSchema = z.object({
  quote: z.string(),
  author: z.string(),
  role: z.string(),
  company: z.string().optional(),
  avatar: z.string().optional(),
});

export const TestimonialsGridSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  testimonials: z.array(TestimonialSchema),
  columns: z.enum(['2', '3']).default('3'),
  backgroundColor: z.string().optional(),
  textColor: z.enum(['light', 'dark']).default('light'),
});

export type TestimonialsGridProps = z.infer<typeof TestimonialsGridSchema>;

export function TestimonialsGrid({
  headline,
  subheadline,
  testimonials,
  columns = '3',
  backgroundColor = '#1e3a5f',
  textColor = 'light',
}: TestimonialsGridProps) {
  const isLight = textColor === 'light';
  const gridCols = columns === '2' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      className="py-16 lg:py-24"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isLight ? 'text-white' : 'text-gray-900'}`}>
            {headline}
          </h2>
          {subheadline && (
            <p className={`text-lg max-w-2xl mx-auto ${isLight ? 'text-white/80' : 'text-gray-600'}`}>
              {subheadline}
            </p>
          )}
          <div className="w-24 h-1 bg-orange-500 mx-auto mt-6" />
        </div>

        {/* Testimonials Grid */}
        <div className={`grid ${gridCols} gap-8`}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`rounded-xl p-8 relative ${isLight ? 'bg-white/10' : 'bg-gray-100'}`}
            >
              {/* Quote Icon */}
              <Quote className={`absolute top-6 right-6 w-10 h-10 ${isLight ? 'text-white/20' : 'text-gray-300'}`} />

              <blockquote className="relative z-10">
                <p className={`leading-relaxed mb-6 italic ${isLight ? 'text-white/90' : 'text-gray-700'}`}>
                  "{testimonial.quote}"
                </p>
                <footer className="flex items-center gap-4">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLight ? 'bg-white/20' : 'bg-gray-200'}`}>
                      <span className={`text-lg font-semibold ${isLight ? 'text-white/70' : 'text-gray-500'}`}>
                        {testimonial.author.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-white' : 'text-gray-900'}`}>
                      {testimonial.author}
                    </div>
                    <div className={`text-sm ${isLight ? 'text-white/70' : 'text-gray-500'}`}>
                      {testimonial.role}
                      {testimonial.company && `, ${testimonial.company}`}
                    </div>
                  </div>
                </footer>
              </blockquote>
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
    ],
  },
  {
    path: 'backgroundColor',
    type: 'color',
    label: 'Background Color',
  },
  {
    path: 'textColor',
    type: 'select',
    label: 'Text Color',
    options: [
      { label: 'Light (for dark backgrounds)', value: 'light' },
      { label: 'Dark (for light backgrounds)', value: 'dark' },
    ],
  },
  {
    path: 'testimonials',
    type: 'array',
    label: 'Testimonials',
    itemFields: [
      { path: 'quote', type: 'richtext', label: 'Quote' },
      { path: 'author', type: 'text', label: 'Author Name' },
      { path: 'role', type: 'text', label: 'Role/Title' },
      { path: 'company', type: 'text', label: 'Company' },
      { path: 'avatar', type: 'image', label: 'Avatar URL' },
    ],
  },
];

registerComponent({
  id: 'testimonials-grid',
  category: 'testimonials',
  name: 'Testimonials Grid',
  description: 'A grid of customer testimonials with quotes and author info',
  schema: TestimonialsGridSchema,
  defaultProps: {
    headline: 'What Our Clients Say',
    subheadline: 'Hear from the businesses we\'ve helped succeed',
    columns: '3',
    backgroundColor: '#1e3a5f',
    textColor: 'light',
    testimonials: [
      {
        quote: 'This platform transformed our business. The results speak for themselves.',
        author: 'Sarah Johnson',
        role: 'CEO',
        company: 'Tech Startup',
      },
      {
        quote: 'Incredible support team and amazing features. Highly recommended!',
        author: 'Michael Chen',
        role: 'Marketing Director',
        company: 'Growth Agency',
      },
      {
        quote: 'We saw a 300% increase in conversions after switching to this platform.',
        author: 'Emily Davis',
        role: 'Founder',
        company: 'E-commerce Brand',
      },
    ],
  },
  component: TestimonialsGrid,
  editableFields,
  tags: ['testimonials', 'reviews', 'social-proof'],
});

export default TestimonialsGrid;
