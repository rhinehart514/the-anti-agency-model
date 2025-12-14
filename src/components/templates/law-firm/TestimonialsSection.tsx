'use client'

import { EditableText } from '@/components/editor'
import { useEditMode } from '@/components/editor'

interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  image?: string
}

interface TestimonialsSectionProps {
  headline: string
  testimonials: Testimonial[]
}

export function TestimonialsSection({ headline, testimonials }: TestimonialsSectionProps) {
  const { updateSection } = useEditMode()

  const handleTestimonialChange = (id: string, field: 'quote' | 'author' | 'role', value: string) => {
    const updatedTestimonials = testimonials.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    )
    updateSection('testimonials', { testimonials: updatedTestimonials })
  }

  return (
    <section id="testimonials" className="section-padding bg-primary-900 text-white">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center mb-16">
          <EditableText
            value={headline}
            onChange={(value) => updateSection('testimonials', { headline: value })}
            className="text-3xl md:text-4xl font-serif font-bold mb-4"
            as="h2"
            aiContext={{ sectionType: 'testimonials-headline' }}
          />
          <div className="w-24 h-1 bg-accent-500 mx-auto" />
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-primary-800 rounded-xl p-8 relative"
            >
              {/* Quote mark */}
              <div className="absolute top-6 right-6 text-6xl text-primary-700 font-serif leading-none">
                "
              </div>

              <blockquote className="relative z-10">
                <EditableText
                  value={testimonial.quote}
                  onChange={(v) => handleTestimonialChange(testimonial.id, 'quote', v)}
                  className="text-primary-100 leading-relaxed mb-6 italic"
                  as="p"
                  aiContext={{ sectionType: 'testimonial-quote' }}
                />
                <footer className="flex items-center gap-4">
                  {testimonial.image ? (
                    <img
                      src={testimonial.image}
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary-300">
                        {testimonial.author.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <EditableText
                      value={testimonial.author}
                      onChange={(v) => handleTestimonialChange(testimonial.id, 'author', v)}
                      className="not-italic font-semibold text-white"
                      as="span"
                      aiContext={{ sectionType: 'testimonial-author' }}
                    />
                    <EditableText
                      value={testimonial.role}
                      onChange={(v) => handleTestimonialChange(testimonial.id, 'role', v)}
                      className="text-sm text-primary-400"
                      as="p"
                      aiContext={{ sectionType: 'testimonial-role' }}
                    />
                  </div>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
