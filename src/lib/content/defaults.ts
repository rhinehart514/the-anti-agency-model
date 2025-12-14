import type { PageContent } from './types'

export const DEFAULT_LAW_FIRM_CONTENT: PageContent = {
  siteInfo: {
    firmName: 'Smith & Johnson Law',
    phone: '(555) 123-4567',
    email: 'info@smithjohnsonlaw.com',
    address: '123 Legal Avenue, Suite 500\nSan Francisco, CA 94102',
  },
  sections: [
    {
      type: 'hero',
      headline: 'Trusted Legal Counsel When You Need It Most',
      subheadline:
        'For over three decades, Smith & Johnson Law has been providing exceptional legal representation to individuals and businesses throughout the Bay Area. We fight for your rights with integrity and dedication.',
      ctaText: 'Schedule a Free Consultation',
      ctaUrl: '#contact',
    },
    {
      type: 'services',
      headline: 'Our Practice Areas',
      subheadline:
        'We offer comprehensive legal services tailored to meet your unique needs. Our experienced attorneys are here to guide you through every step.',
      services: [
        {
          id: '1',
          title: 'Personal Injury',
          description:
            "Injured due to someone else's negligence? We'll fight to get you the compensation you deserve for medical bills, lost wages, and pain and suffering.",
          icon: 'shield',
        },
        {
          id: '2',
          title: 'Business Law',
          description:
            'From formation to dissolution, we help businesses navigate complex legal matters including contracts, disputes, and regulatory compliance.',
          icon: 'briefcase',
        },
        {
          id: '3',
          title: 'Family Law',
          description:
            'Compassionate representation for divorce, child custody, support matters, and other family legal issues during difficult times.',
          icon: 'users',
        },
        {
          id: '4',
          title: 'Estate Planning',
          description:
            'Protect your legacy with comprehensive estate plans including wills, trusts, and powers of attorney tailored to your wishes.',
          icon: 'document',
        },
        {
          id: '5',
          title: 'Real Estate',
          description:
            'Expert guidance for residential and commercial real estate transactions, disputes, and landlord-tenant matters.',
          icon: 'home',
        },
        {
          id: '6',
          title: 'Criminal Defense',
          description:
            'Aggressive defense representation to protect your rights and freedom. Available 24/7 for emergencies.',
          icon: 'scale',
        },
      ],
    },
    {
      type: 'about',
      headline: 'A Legacy of Legal Excellence',
      description:
        'Founded in 1992, Smith & Johnson Law has grown from a small practice to one of the most respected law firms in the Bay Area. Our team of dedicated attorneys combines decades of experience with a client-first approach. We believe that everyone deserves access to quality legal representation, and we work tirelessly to achieve the best possible outcomes for our clients.',
      stats: [
        { label: 'Years Experience', value: '30+' },
        { label: 'Cases Won', value: '5,000+' },
        { label: 'Client Satisfaction', value: '98%' },
      ],
      team: [
        { id: '1', name: 'Robert Smith', title: 'Founding Partner' },
        { id: '2', name: 'Margaret Johnson', title: 'Senior Partner' },
        { id: '3', name: 'David Chen', title: 'Associate Attorney' },
        { id: '4', name: 'Sarah Martinez', title: 'Associate Attorney' },
      ],
    },
    {
      type: 'testimonials',
      headline: 'What Our Clients Say',
      testimonials: [
        {
          id: '1',
          quote:
            "Smith & Johnson Law handled my personal injury case with professionalism and genuine care. They secured a settlement that covered all my medical expenses and more. I couldn't have asked for better representation.",
          author: 'Michael R.',
          role: 'Personal Injury Client',
        },
        {
          id: '2',
          quote:
            "When starting my business, their team guided me through every legal hurdle. They're not just our lawyers, they're trusted advisors we turn to for all our business needs.",
          author: 'Jennifer T.',
          role: 'Business Owner',
        },
        {
          id: '3',
          quote:
            "Going through a divorce was the hardest time of my life, but my attorney made the process as smooth as possible. They fought for my children's best interests and got us a fair outcome.",
          author: 'David K.',
          role: 'Family Law Client',
        },
      ],
    },
    {
      type: 'contact',
      headline: 'Get in Touch',
      subheadline:
        "Ready to discuss your legal needs? Contact us today for a free initial consultation. We're here to help.",
      contactInfo: {
        address: '123 Legal Avenue, Suite 500\nSan Francisco, CA 94102',
        phone: '(555) 123-4567',
        email: 'info@smithjohnsonlaw.com',
        hours: 'Monday - Friday: 8:00 AM - 6:00 PM\nSaturday: By appointment\nSunday: Closed',
      },
    },
    {
      type: 'footer',
      firmName: 'Smith & Johnson Law',
      tagline: 'Trusted Legal Counsel for Over 30 Years',
      contactInfo: {
        phone: '(555) 123-4567',
        email: 'info@smithjohnsonlaw.com',
        address: '123 Legal Avenue, Suite 500\nSan Francisco, CA 94102',
      },
    },
  ],
}
