import { z } from 'zod'

// ============================================
// Block Content Types
// ============================================

export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
})

export const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
})

export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
})

export const CTABlockSchema = z.object({
  type: z.literal('cta'),
  headline: z.string(),
  subtext: z.string(),
  buttonText: z.string(),
  buttonUrl: z.string(),
})

export const ServiceBlockSchema = z.object({
  type: z.literal('service'),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
})

export const TestimonialBlockSchema = z.object({
  type: z.literal('testimonial'),
  id: z.string(),
  quote: z.string(),
  author: z.string(),
  role: z.string(),
  image: z.string().optional(),
})

export const TeamMemberBlockSchema = z.object({
  type: z.literal('team_member'),
  id: z.string(),
  name: z.string(),
  title: z.string(),
  image: z.string().optional(),
  bio: z.string().optional(),
})

export const StatBlockSchema = z.object({
  type: z.literal('stat'),
  label: z.string(),
  value: z.string(),
})

export const ContactInfoBlockSchema = z.object({
  type: z.literal('contact_info'),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  hours: z.string(),
})

// ============================================
// Section Content Types
// ============================================

export const HeroSectionSchema = z.object({
  type: z.literal('hero'),
  headline: z.string(),
  subheadline: z.string(),
  ctaText: z.string(),
  ctaUrl: z.string(),
  backgroundImage: z.string().optional(),
})

export const ServicesSectionSchema = z.object({
  type: z.literal('services'),
  headline: z.string(),
  subheadline: z.string(),
  services: z.array(ServiceBlockSchema.omit({ type: true })),
})

export const AboutSectionSchema = z.object({
  type: z.literal('about'),
  headline: z.string(),
  description: z.string(),
  stats: z.array(StatBlockSchema.omit({ type: true })),
  team: z.array(TeamMemberBlockSchema.omit({ type: true })).optional(),
})

export const TestimonialsSectionSchema = z.object({
  type: z.literal('testimonials'),
  headline: z.string(),
  testimonials: z.array(TestimonialBlockSchema.omit({ type: true })),
})

export const ContactSectionSchema = z.object({
  type: z.literal('contact'),
  headline: z.string(),
  subheadline: z.string(),
  contactInfo: ContactInfoBlockSchema.omit({ type: true }),
})

export const FooterSectionSchema = z.object({
  type: z.literal('footer'),
  firmName: z.string(),
  tagline: z.string(),
  contactInfo: z.object({
    phone: z.string(),
    email: z.string(),
    address: z.string(),
  }),
})

// ============================================
// Page Content Schema
// ============================================

export const SectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  ServicesSectionSchema,
  AboutSectionSchema,
  TestimonialsSectionSchema,
  ContactSectionSchema,
  FooterSectionSchema,
])

export const PageContentSchema = z.object({
  sections: z.array(SectionSchema),
  siteInfo: z.object({
    firmName: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
  }),
})

// ============================================
// Type Exports
// ============================================

export type HeadingBlock = z.infer<typeof HeadingBlockSchema>
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>
export type ImageBlock = z.infer<typeof ImageBlockSchema>
export type CTABlock = z.infer<typeof CTABlockSchema>
export type ServiceBlock = z.infer<typeof ServiceBlockSchema>
export type TestimonialBlock = z.infer<typeof TestimonialBlockSchema>
export type TeamMemberBlock = z.infer<typeof TeamMemberBlockSchema>
export type StatBlock = z.infer<typeof StatBlockSchema>
export type ContactInfoBlock = z.infer<typeof ContactInfoBlockSchema>

export type HeroSection = z.infer<typeof HeroSectionSchema>
export type ServicesSection = z.infer<typeof ServicesSectionSchema>
export type AboutSection = z.infer<typeof AboutSectionSchema>
export type TestimonialsSection = z.infer<typeof TestimonialsSectionSchema>
export type ContactSection = z.infer<typeof ContactSectionSchema>
export type FooterSection = z.infer<typeof FooterSectionSchema>

export type Section = z.infer<typeof SectionSchema>
export type PageContent = z.infer<typeof PageContentSchema>
