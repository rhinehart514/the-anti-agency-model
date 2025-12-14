'use client'

import { EditModeProvider, EditToolbar, useEditMode, Sidebar } from '@/components/editor'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import type { PageContent, Section } from '@/lib/content/types'
import {
  Navigation,
  HeroSection,
  ServicesSection,
  AboutSection,
  TestimonialsSection,
  ContactSection,
  Footer,
} from '@/components/templates/law-firm'

interface SitePageClientProps {
  content: PageContent
  isOwner: boolean
  siteSlug: string
}

function getSectionByType<T extends Section['type']>(
  sections: Section[],
  type: T
): Extract<Section, { type: T }> | undefined {
  return sections.find((s): s is Extract<Section, { type: T }> => s.type === type)
}

export function SitePageClient({ content, isOwner, siteSlug }: SitePageClientProps) {
  const colorScheme = content.branding?.colorScheme || 'default'

  return (
    <ThemeProvider colorSchemeId={colorScheme}>
      <EditModeProvider
        isOwner={isOwner}
        initialContent={content}
        siteSlug={siteSlug}
        pageSlug="home"
      >
        <SiteContentWrapper>
          <SiteContentInner />
        </SiteContentWrapper>
        {isOwner && <EditToolbar />}
        <Sidebar />
      </EditModeProvider>
    </ThemeProvider>
  )
}

function SiteContentWrapper({ children }: { children: React.ReactNode }) {
  const { isEditMode } = useEditMode()
  return (
    <div className={`transition-all duration-300 ${isEditMode ? 'mr-80' : ''}`}>
      {children}
    </div>
  )
}

function SiteContentInner() {
  const { content } = useEditMode()

  if (!content) return null

  const hero = getSectionByType(content.sections, 'hero')
  const services = getSectionByType(content.sections, 'services')
  const about = getSectionByType(content.sections, 'about')
  const testimonials = getSectionByType(content.sections, 'testimonials')
  const contact = getSectionByType(content.sections, 'contact')
  const footer = getSectionByType(content.sections, 'footer')

  return (
    <main>
      <Navigation
        firmName={content.siteInfo.firmName}
        phone={content.siteInfo.phone}
      />

      {hero && (
        <HeroSection
          headline={hero.headline}
          subheadline={hero.subheadline}
          ctaText={hero.ctaText}
          ctaUrl={hero.ctaUrl}
          backgroundImage={hero.backgroundImage}
        />
      )}

      {services && (
        <ServicesSection
          headline={services.headline}
          subheadline={services.subheadline}
          services={services.services}
        />
      )}

      {about && (
        <AboutSection
          headline={about.headline}
          description={about.description}
          stats={about.stats}
          team={about.team}
        />
      )}

      {testimonials && (
        <TestimonialsSection
          headline={testimonials.headline}
          testimonials={testimonials.testimonials}
        />
      )}

      {contact && (
        <ContactSection
          headline={contact.headline}
          subheadline={contact.subheadline}
          contactInfo={contact.contactInfo}
        />
      )}

      {footer && (
        <Footer
          firmName={footer.firmName}
          tagline={footer.tagline}
          contactInfo={footer.contactInfo}
        />
      )}
    </main>
  )
}
