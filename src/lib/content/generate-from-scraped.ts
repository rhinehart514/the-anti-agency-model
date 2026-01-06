import type { PageContent, Section } from './types';
import type { ScrapedSiteData } from '@/lib/scraping/types';
import { getGroqClient, AI_MODELS } from '@/lib/ai/client';
import { logger } from '@/lib/logger';

export interface GenerationOptions {
  style?: 'modern' | 'classic' | 'bold' | 'minimal';
  colorScheme?: string;
  industry?: string;
  tone?: 'professional' | 'friendly' | 'bold' | 'traditional';
}

export interface GeneratedSite {
  content: PageContent;
  improvements: string[];
  metadata: {
    generatedAt: Date;
    model: string;
    tokensUsed?: number;
  };
}

const CONTENT_GENERATION_PROMPT = `You are an expert website content strategist. Your task is to improve the content from an existing website to make it more compelling, professional, and effective at converting visitors into customers.

BUSINESS CONTEXT:
{{businessContext}}

CURRENT CONTENT:
{{currentContent}}

Generate improved website content in the following JSON structure. Be specific and professional, using actual business details where available:

{
  "hero": {
    "headline": "A compelling headline that speaks to the customer's needs (max 10 words)",
    "subheadline": "A supporting statement that builds trust and explains value (max 25 words)",
    "ctaText": "Action-oriented button text (max 4 words)"
  },
  "services": [
    {
      "title": "Service name",
      "description": "Clear benefit-focused description (max 25 words)"
    }
  ],
  "about": {
    "headline": "About section headline",
    "description": "Compelling about text that builds trust and credibility (2-3 sentences)",
    "stats": [
      { "label": "Stat label", "value": "Stat value" }
    ]
  },
  "testimonials": [
    {
      "quote": "A believable testimonial (or improve existing one)",
      "author": "Customer name",
      "role": "Their role or company"
    }
  ],
  "contact": {
    "headline": "Contact section headline",
    "subheadline": "Encouraging message to reach out"
  },
  "improvements": [
    "List of specific improvements made to the content"
  ]
}

GUIDELINES:
1. Keep the business name and contact info exactly as provided
2. Make headlines customer-focused (what they get, not what you do)
3. Use specific numbers and details where possible
4. Include a clear call-to-action in the hero section
5. Keep services to 3-6 items, focusing on the most important
6. If testimonials exist, improve them. If not, suggest placeholder text to collect
7. Add trust signals and compelling CTAs where appropriate

Respond ONLY with valid JSON, no additional text.`;

export async function generateSiteFromScraped(
  scraped: ScrapedSiteData,
  options: GenerationOptions = {}
): Promise<GeneratedSite> {
  const groq = getGroqClient();

  if (!groq) {
    logger.warn('Groq client not configured, using template-based generation');
    return generateWithoutAi(scraped, options);
  }

  // Build context for the prompt
  const businessContext = buildBusinessContext(scraped);
  const currentContent = buildCurrentContentContext(scraped);

  const prompt = CONTENT_GENERATION_PROMPT
    .replace('{{businessContext}}', businessContext)
    .replace('{{currentContent}}', currentContent);

  try {
    logger.info({ url: scraped.url }, 'Generating improved content with AI');

    const response = await groq.chat.completions.create({
      model: AI_MODELS.LLAMA_70B,
      messages: [
        {
          role: 'system',
          content: 'You are a website content expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const generated = parseGeneratedContent(content);
    const pageContent = buildPageContent(scraped, generated, options);

    return {
      content: pageContent,
      improvements: generated.improvements || [],
      metadata: {
        generatedAt: new Date(),
        model: AI_MODELS.LLAMA_70B,
        tokensUsed: response.usage?.total_tokens,
      },
    };
  } catch (error) {
    logger.error({ error }, 'AI content generation failed, falling back to template');
    return generateWithoutAi(scraped, options);
  }
}

function buildBusinessContext(scraped: ScrapedSiteData): string {
  const parts: string[] = [];

  if (scraped.business.name) {
    parts.push(`Business Name: ${scraped.business.name}`);
  }
  if (scraped.business.tagline) {
    parts.push(`Tagline: ${scraped.business.tagline}`);
  }
  if (scraped.business.description) {
    parts.push(`Description: ${scraped.business.description}`);
  }
  if (scraped.business.phone) {
    parts.push(`Phone: ${scraped.business.phone}`);
  }
  if (scraped.business.email) {
    parts.push(`Email: ${scraped.business.email}`);
  }
  if (scraped.business.address) {
    parts.push(`Address: ${scraped.business.address}`);
  }
  if (scraped.content.services.length > 0) {
    parts.push(`Services: ${scraped.content.services.join(', ')}`);
  }

  return parts.join('\n') || 'No business information available';
}

function buildCurrentContentContext(scraped: ScrapedSiteData): string {
  const parts: string[] = [];

  if (scraped.content.heroText) {
    parts.push(`Hero Text: "${scraped.content.heroText}"`);
  }
  if (scraped.content.heroSubtext) {
    parts.push(`Hero Subtext: "${scraped.content.heroSubtext}"`);
  }
  if (scraped.content.aboutText) {
    parts.push(`About: "${scraped.content.aboutText.substring(0, 300)}..."`);
  }
  if (scraped.content.services.length > 0) {
    parts.push(`Services: ${scraped.content.services.slice(0, 6).join(', ')}`);
  }
  if (scraped.content.testimonials.length > 0) {
    const firstTestimonial = scraped.content.testimonials[0];
    parts.push(`Sample Testimonial: "${firstTestimonial.text}" - ${firstTestimonial.author || 'Anonymous'}`);
  }
  if (scraped.content.ctaText) {
    parts.push(`CTA Text: "${scraped.content.ctaText}"`);
  }

  return parts.join('\n') || 'No existing content to improve';
}

interface GeneratedContent {
  hero?: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
  };
  services?: Array<{
    title: string;
    description: string;
  }>;
  about?: {
    headline?: string;
    description?: string;
    stats?: Array<{ label: string; value: string }>;
  };
  testimonials?: Array<{
    quote: string;
    author: string;
    role?: string;
  }>;
  contact?: {
    headline?: string;
    subheadline?: string;
  };
  improvements?: string[];
}

function parseGeneratedContent(content: string): GeneratedContent {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    logger.warn('Failed to parse AI response as JSON');
    return {};
  }
}

function buildPageContent(
  scraped: ScrapedSiteData,
  generated: GeneratedContent,
  options: GenerationOptions
): PageContent {
  const businessName = scraped.business.name || 'Your Business';
  const phone = scraped.business.phone || '';
  const email = scraped.business.email || '';
  const address = scraped.business.address || '';

  const sections: Section[] = [
    // Hero section
    {
      type: 'hero' as const,
      headline: generated.hero?.headline || scraped.content.heroText || `Welcome to ${businessName}`,
      subheadline: generated.hero?.subheadline || scraped.content.heroSubtext || 'We\'re here to help you succeed.',
      ctaText: generated.hero?.ctaText || scraped.content.ctaText || 'Get Started',
      ctaUrl: '#contact',
      backgroundImage: scraped.assets.heroImage || undefined,
    },
    // Services section
    {
      type: 'services' as const,
      headline: 'Our Services',
      subheadline: 'What we offer',
      services: (generated.services || scraped.content.services.map(s => ({
        title: s,
        description: 'Expert service tailored to your needs.',
      }))).slice(0, 6).map((s, i) => ({
        id: String(i + 1),
        title: s.title,
        description: s.description,
        icon: 'star',
      })),
    },
    // About section
    {
      type: 'about' as const,
      headline: generated.about?.headline || 'About Us',
      description: generated.about?.description || scraped.content.aboutText || scraped.business.description || `${businessName} is dedicated to providing exceptional service.`,
      stats: generated.about?.stats || [
        { label: 'Years in Business', value: '10+' },
        { label: 'Happy Customers', value: '500+' },
        { label: 'Satisfaction Rate', value: '98%' },
      ],
    },
    // Testimonials section
    {
      type: 'testimonials' as const,
      headline: 'What Our Clients Say',
      testimonials: (generated.testimonials || scraped.content.testimonials.map(t => ({
        quote: t.text,
        author: t.author || 'Happy Customer',
        role: t.role || 'Client',
      }))).slice(0, 3).map((t, i) => ({
        id: String(i + 1),
        quote: t.quote,
        author: t.author,
        role: t.role || 'Client',
      })),
    },
    // Contact section
    {
      type: 'contact' as const,
      headline: generated.contact?.headline || 'Get in Touch',
      subheadline: generated.contact?.subheadline || 'Ready to get started? Contact us today.',
      contactInfo: {
        address: address || '123 Business St.',
        phone: phone || '(555) 123-4567',
        email: email || 'contact@example.com',
        hours: scraped.business.hours || 'Mon-Fri: 9am - 5pm',
      },
    },
    // Footer section
    {
      type: 'footer' as const,
      firmName: businessName,
      tagline: scraped.business.tagline || 'Your trusted partner',
      contactInfo: {
        phone,
        email,
        address,
      },
    },
  ];

  return {
    sections,
    siteInfo: {
      firmName: businessName,
      phone,
      email,
      address,
    },
    branding: {
      colorScheme: options.colorScheme || 'default',
      tone: options.tone || 'professional',
      industry: options.industry,
    },
  };
}

function generateWithoutAi(
  scraped: ScrapedSiteData,
  options: GenerationOptions
): GeneratedSite {
  const content = buildPageContent(scraped, {}, options);

  return {
    content,
    improvements: [
      'Imported existing business information',
      'Structured content into professional sections',
      'Added standard contact and footer sections',
    ],
    metadata: {
      generatedAt: new Date(),
      model: 'template-based',
    },
  };
}

export { buildBusinessContext, buildPageContent };
