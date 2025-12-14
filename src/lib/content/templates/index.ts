import type { PageContent } from '../types'
import type { WizardState, ServiceItem } from '@/components/wizard/WizardProvider'

// ============================================
// Industry Default Services
// ============================================

interface IndustryDefaults {
  services: Omit<ServiceItem, 'id'>[]
  defaultHeadline: string
  defaultSubheadline: string
  defaultCta: string
  defaultAbout: string
  compliance?: string
}

const INDUSTRY_DEFAULTS: Record<string, IndustryDefaults> = {
  'law-firm': {
    services: [
      { title: 'Personal Injury', description: 'Fighting for fair compensation when you\'ve been injured due to negligence.', icon: 'shield' },
      { title: 'Business Law', description: 'Comprehensive legal services for businesses of all sizes.', icon: 'briefcase' },
      { title: 'Family Law', description: 'Compassionate representation for divorce, custody, and family matters.', icon: 'users' },
      { title: 'Estate Planning', description: 'Protecting your legacy with wills, trusts, and estate administration.', icon: 'document' },
      { title: 'Real Estate', description: 'Expert guidance for property transactions and disputes.', icon: 'home' },
      { title: 'Criminal Defense', description: 'Aggressive defense to protect your rights and freedom.', icon: 'scale' },
    ],
    defaultHeadline: 'Trusted Legal Counsel When You Need It Most',
    defaultSubheadline: 'We provide exceptional legal representation with integrity and dedication.',
    defaultCta: 'Schedule a Free Consultation',
    defaultAbout: 'Our firm has been providing exceptional legal representation to individuals and businesses. We combine decades of experience with a client-first approach.',
    compliance: 'This is an attorney advertisement. Prior results do not guarantee a similar outcome.',
  },
  medical: {
    services: [
      { title: 'Primary Care', description: 'Comprehensive healthcare for patients of all ages.', icon: 'heart' },
      { title: 'Preventive Medicine', description: 'Regular checkups and screenings to keep you healthy.', icon: 'shield' },
      { title: 'Chronic Care Management', description: 'Ongoing support for managing chronic conditions.', icon: 'chart' },
      { title: 'Urgent Care', description: 'Same-day appointments for non-emergency medical needs.', icon: 'star' },
      { title: 'Telehealth', description: 'Virtual visits from the comfort of your home.', icon: 'globe' },
      { title: 'Wellness Programs', description: 'Personalized plans for optimal health and wellbeing.', icon: 'lightbulb' },
    ],
    defaultHeadline: 'Your Health, Our Priority',
    defaultSubheadline: 'Providing compassionate, comprehensive healthcare for you and your family.',
    defaultCta: 'Book an Appointment',
    defaultAbout: 'We are dedicated to providing high-quality, patient-centered healthcare. Our team of experienced professionals is committed to your wellbeing.',
    compliance: 'This practice complies with applicable Federal civil rights laws.',
  },
  'real-estate': {
    services: [
      { title: 'Home Buying', description: 'Find your dream home with expert guidance every step of the way.', icon: 'home' },
      { title: 'Home Selling', description: 'Maximize your property value with strategic marketing and pricing.', icon: 'chart' },
      { title: 'Property Management', description: 'Professional management services for rental properties.', icon: 'gear' },
      { title: 'Investment Properties', description: 'Build wealth through strategic real estate investments.', icon: 'briefcase' },
      { title: 'First-Time Buyers', description: 'Special programs and guidance for first-time homeowners.', icon: 'star' },
      { title: 'Commercial Real Estate', description: 'Expert services for commercial property transactions.', icon: 'document' },
    ],
    defaultHeadline: 'Find Your Perfect Place',
    defaultSubheadline: 'Expert real estate services to help you buy, sell, or invest with confidence.',
    defaultCta: 'Start Your Search',
    defaultAbout: 'With deep local market knowledge and a commitment to client success, we\'ve helped hundreds of families find their perfect property.',
  },
  consulting: {
    services: [
      { title: 'Strategy Consulting', description: 'Develop winning strategies to achieve your business goals.', icon: 'lightbulb' },
      { title: 'Operations Improvement', description: 'Streamline processes and boost operational efficiency.', icon: 'gear' },
      { title: 'Digital Transformation', description: 'Navigate the digital landscape with expert guidance.', icon: 'globe' },
      { title: 'Change Management', description: 'Successfully implement organizational changes.', icon: 'users' },
      { title: 'Financial Advisory', description: 'Strategic financial planning and analysis.', icon: 'chart' },
      { title: 'Executive Coaching', description: 'Develop leadership skills and achieve personal growth.', icon: 'star' },
    ],
    defaultHeadline: 'Transform Your Business',
    defaultSubheadline: 'Strategic consulting to help you navigate challenges and seize opportunities.',
    defaultCta: 'Get Started',
    defaultAbout: 'We partner with businesses to solve complex challenges and drive sustainable growth. Our team brings decades of industry experience.',
  },
  restaurant: {
    services: [
      { title: 'Dine-In', description: 'Enjoy a memorable dining experience in our welcoming atmosphere.', icon: 'star' },
      { title: 'Takeout', description: 'Your favorite dishes, ready when you are.', icon: 'briefcase' },
      { title: 'Delivery', description: 'Fresh, delicious food delivered to your door.', icon: 'home' },
      { title: 'Catering', description: 'Let us make your next event unforgettable.', icon: 'users' },
      { title: 'Private Events', description: 'Host your special occasion in our private dining space.', icon: 'heart' },
      { title: 'Online Ordering', description: 'Order ahead for quick and easy pickup.', icon: 'globe' },
    ],
    defaultHeadline: 'Unforgettable Flavors Await',
    defaultSubheadline: 'Fresh ingredients, authentic recipes, and a passion for great food.',
    defaultCta: 'View Menu',
    defaultAbout: 'We believe great food brings people together. Every dish is crafted with care using the finest ingredients.',
  },
  retail: {
    services: [
      { title: 'In-Store Shopping', description: 'Browse our curated selection in person.', icon: 'star' },
      { title: 'Online Store', description: 'Shop from anywhere, anytime.', icon: 'globe' },
      { title: 'Custom Orders', description: 'Personalized products tailored to your needs.', icon: 'gear' },
      { title: 'Gift Services', description: 'Perfect presents with expert wrapping.', icon: 'heart' },
      { title: 'Loyalty Program', description: 'Earn rewards with every purchase.', icon: 'shield' },
      { title: 'Free Shipping', description: 'Complimentary delivery on qualifying orders.', icon: 'home' },
    ],
    defaultHeadline: 'Quality Products, Exceptional Service',
    defaultSubheadline: 'Discover carefully curated products you\'ll love.',
    defaultCta: 'Shop Now',
    defaultAbout: 'We\'re passionate about bringing you the best products with outstanding customer service.',
  },
  fitness: {
    services: [
      { title: 'Personal Training', description: 'One-on-one coaching to reach your fitness goals.', icon: 'star' },
      { title: 'Group Classes', description: 'Fun, motivating workouts with a supportive community.', icon: 'users' },
      { title: 'Nutrition Coaching', description: 'Expert guidance for healthy eating habits.', icon: 'heart' },
      { title: 'Online Programs', description: 'Train anywhere with our virtual fitness programs.', icon: 'globe' },
      { title: 'Recovery Services', description: 'Massage, stretching, and recovery treatments.', icon: 'shield' },
      { title: 'Membership Options', description: 'Flexible plans to fit your lifestyle.', icon: 'document' },
    ],
    defaultHeadline: 'Your Fitness Journey Starts Here',
    defaultSubheadline: 'Transform your body and mind with expert guidance and support.',
    defaultCta: 'Start Free Trial',
    defaultAbout: 'We\'re more than a gym—we\'re a community dedicated to helping you become your best self.',
  },
  other: {
    services: [
      { title: 'Service 1', description: 'Description of your first service offering.', icon: 'star' },
      { title: 'Service 2', description: 'Description of your second service offering.', icon: 'briefcase' },
      { title: 'Service 3', description: 'Description of your third service offering.', icon: 'users' },
    ],
    defaultHeadline: 'Welcome to Our Business',
    defaultSubheadline: 'We\'re here to help you succeed.',
    defaultCta: 'Contact Us',
    defaultAbout: 'Tell your story here. What makes your business special?',
  },
}

// ============================================
// Utility Functions
// ============================================

export function getIndustryDefaults(industry: string): IndustryDefaults {
  return INDUSTRY_DEFAULTS[industry] || INDUSTRY_DEFAULTS.other
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// ============================================
// Content Generation
// ============================================

export function generatePageContent(wizard: WizardState): PageContent {
  const defaults = getIndustryDefaults(wizard.industry || 'other')

  // Use wizard services or fall back to industry defaults
  const services = wizard.services.length > 0
    ? wizard.services.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        icon: s.icon,
      }))
    : defaults.services.map((s, i) => ({
        id: String(i + 1),
        title: s.title,
        description: s.description,
        icon: s.icon,
      }))

  // Generate headline
  const headline = wizard.businessInfo.tagline || defaults.defaultHeadline

  // Generate about content
  const aboutDescription = wizard.about.description || defaults.defaultAbout

  // Map stats
  const stats = wizard.about.stats.map(s => ({
    label: s.label,
    value: s.value,
  }))

  // Map team members
  const team = wizard.about.teamMembers.map(m => ({
    id: m.id,
    name: m.name,
    title: m.role,
  }))

  return {
    siteInfo: {
      firmName: wizard.businessInfo.name,
      phone: wizard.businessInfo.phone || '',
      email: wizard.businessInfo.email,
      address: wizard.businessInfo.address || '',
    },
    branding: {
      colorScheme: wizard.branding.colorScheme || 'default',
      tone: wizard.branding.tone || 'professional',
      industry: wizard.industry || undefined,
    },
    sections: [
      {
        type: 'hero',
        headline,
        subheadline: defaults.defaultSubheadline,
        ctaText: defaults.defaultCta,
        ctaUrl: '#contact',
      },
      {
        type: 'services',
        headline: 'Our Services',
        subheadline: 'Explore what we offer',
        services,
      },
      {
        type: 'about',
        headline: 'About Us',
        description: aboutDescription,
        stats: stats.length > 0 ? stats : [
          { label: 'Years Experience', value: '10+' },
          { label: 'Happy Clients', value: '500+' },
          { label: 'Satisfaction', value: '98%' },
        ],
        team: team.length > 0 ? team : undefined,
      },
      {
        type: 'testimonials',
        headline: 'What Our Clients Say',
        testimonials: [
          {
            id: '1',
            quote: 'Amazing service! They exceeded our expectations.',
            author: 'Happy Customer',
            role: 'Client',
          },
        ],
      },
      {
        type: 'contact',
        headline: 'Get in Touch',
        subheadline: "Ready to get started? Contact us today.",
        contactInfo: {
          address: wizard.businessInfo.address || '123 Main Street',
          phone: wizard.businessInfo.phone || '(555) 123-4567',
          email: wizard.businessInfo.email,
          hours: 'Monday - Friday: 9:00 AM - 5:00 PM',
        },
      },
      {
        type: 'footer',
        firmName: wizard.businessInfo.name,
        tagline: wizard.businessInfo.tagline || defaults.defaultSubheadline,
        contactInfo: {
          phone: wizard.businessInfo.phone || '',
          email: wizard.businessInfo.email,
          address: wizard.businessInfo.address || '',
        },
      },
    ],
  }
}
