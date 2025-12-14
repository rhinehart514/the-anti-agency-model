'use client'

import { useEditMode, EditableText } from '@/components/editor'

interface HeroSectionProps {
  headline: string
  subheadline: string
  ctaText: string
  ctaUrl: string
  backgroundImage?: string
}

export function HeroSection({
  headline,
  subheadline,
  ctaText,
  ctaUrl,
  backgroundImage,
}: HeroSectionProps) {
  const { isEditMode, updateSection } = useEditMode()

  return (
    <section className="relative min-h-[600px] flex items-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-primary-900"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-primary-900/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-wide section-padding text-white">
        <div className="max-w-3xl">
          <EditableText
            value={headline}
            onChange={(value) => updateSection('hero', { headline: value })}
            placeholder="Enter headline..."
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-6"
            as="h1"
          />

          <EditableText
            value={subheadline}
            onChange={(value) => updateSection('hero', { subheadline: value })}
            placeholder="Enter subheadline..."
            className="text-xl md:text-2xl text-primary-100 mb-8 leading-relaxed"
            as="p"
            richText
          />

          <div className="flex flex-col sm:flex-row gap-4">
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <EditableText
                  value={ctaText}
                  onChange={(value) => updateSection('hero', { ctaText: value })}
                  placeholder="Button text..."
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent-500 text-white font-semibold rounded-lg"
                  as="span"
                />
              </div>
            ) : (
              <a
                href={ctaUrl}
                className="inline-flex items-center justify-center px-8 py-4 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 transition-colors duration-200"
              >
                {ctaText}
              </a>
            )}
            <a
              href="#services"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-200"
            >
              Our Services
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
