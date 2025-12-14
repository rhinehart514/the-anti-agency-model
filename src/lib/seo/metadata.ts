import type { Metadata } from 'next'
import type { PageContent } from '@/lib/content/types'

interface SiteMetadataOptions {
  siteSlug: string
  content: PageContent
  baseUrl?: string
}

export function generateSiteMetadata({
  siteSlug,
  content,
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
}: SiteMetadataOptions): Metadata {
  const { siteInfo, sections, branding } = content
  const heroSection = sections.find((s) => s.type === 'hero')

  const title = siteInfo.firmName
  const description =
    heroSection?.type === 'hero'
      ? heroSection.subheadline
      : `Welcome to ${siteInfo.firmName}`

  const url = `${baseUrl}/sites/${siteSlug}`

  return {
    title,
    description,
    keywords: generateKeywords(content),
    authors: [{ name: siteInfo.firmName }],
    creator: siteInfo.firmName,
    publisher: siteInfo.firmName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: siteInfo.firmName,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'format-detection': 'telephone=yes',
    },
  }
}

function generateKeywords(content: PageContent): string[] {
  const keywords: string[] = []

  // Add firm name
  keywords.push(content.siteInfo.firmName)

  // Add industry
  if (content.branding?.industry) {
    keywords.push(content.branding.industry.replace('-', ' '))
  }

  // Add services from services section
  const servicesSection = content.sections.find((s) => s.type === 'services')
  if (servicesSection?.type === 'services') {
    servicesSection.services.forEach((service) => {
      keywords.push(service.title)
    })
  }

  return keywords.slice(0, 10) // Limit to 10 keywords
}

export function generateStructuredData(content: PageContent, siteSlug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const { siteInfo, sections, branding } = content

  const heroSection = sections.find((s) => s.type === 'hero')
  const contactSection = sections.find((s) => s.type === 'contact')

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(branding?.industry),
    name: siteInfo.firmName,
    url: `${baseUrl}/sites/${siteSlug}`,
    description:
      heroSection?.type === 'hero'
        ? heroSection.subheadline
        : `Welcome to ${siteInfo.firmName}`,
    telephone: siteInfo.phone,
    email: siteInfo.email,
    address: siteInfo.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: siteInfo.address,
        }
      : undefined,
    openingHours:
      contactSection?.type === 'contact'
        ? contactSection.contactInfo.hours
        : undefined,
  }

  return structuredData
}

function getSchemaType(industry?: string): string {
  const schemaTypes: Record<string, string> = {
    'law-firm': 'LegalService',
    medical: 'MedicalBusiness',
    'real-estate': 'RealEstateAgent',
    consulting: 'ProfessionalService',
    restaurant: 'Restaurant',
    retail: 'Store',
    fitness: 'SportsActivityLocation',
  }

  return schemaTypes[industry || ''] || 'LocalBusiness'
}
