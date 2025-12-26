'use client';

import { z } from 'zod';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

const LinkSchema = z.object({
  text: z.string(),
  url: z.string(),
});

const SocialLinkSchema = z.object({
  platform: z.enum(['facebook', 'twitter', 'linkedin', 'instagram', 'youtube']),
  url: z.string(),
});

export const FooterSimpleSchema = z.object({
  companyName: z.string(),
  tagline: z.string().optional(),
  links: z.array(LinkSchema).optional(),
  socialLinks: z.array(SocialLinkSchema).optional(),
  copyright: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export type FooterSimpleProps = z.infer<typeof FooterSimpleSchema>;

const socialIcons: Record<string, React.ReactNode> = {
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.44 4.83c-.8.37-1.5.38-2.22.02.93-.56.98-.96 1.32-2.02-.88.52-1.86.9-2.9 1.1-.82-.88-2-1.43-3.3-1.43-2.5 0-4.55 2.04-4.55 4.54 0 .36.03.7.1 1.04-3.77-.2-7.12-2-9.36-4.75-.4.67-.6 1.45-.6 2.3 0 1.56.8 2.95 2 3.77-.74-.03-1.44-.23-2.05-.57v.06c0 2.2 1.56 4.03 3.64 4.44-.67.2-1.37.2-2.06.08.58 1.8 2.26 3.12 4.25 3.16C5.78 18.1 3.37 18.74 1 18.46c2 1.3 4.4 2.04 6.97 2.04 8.35 0 12.92-6.92 12.92-12.93 0-.2 0-.4-.02-.6.9-.63 1.96-1.22 2.56-2.14z"/>
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
};

export function FooterSimple({
  companyName,
  tagline,
  links,
  socialLinks,
  copyright,
  backgroundColor = '#0f172a',
}: FooterSimpleProps) {
  const year = new Date().getFullYear();
  const defaultCopyright = `© ${year} ${companyName}. All rights reserved.`;

  return (
    <footer
      className="py-12"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-2">{companyName}</h3>
            {tagline && (
              <p className="text-gray-400">{tagline}</p>
            )}
          </div>

          {/* Links */}
          {links && links.length > 0 && (
            <nav className="flex flex-wrap justify-center gap-6">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {link.text}
                </a>
              ))}
            </nav>
          )}

          {/* Social Links */}
          {socialLinks && socialLinks.length > 0 && (
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={social.platform}
                >
                  {socialIcons[social.platform]}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            {copyright || defaultCopyright}
          </p>
        </div>
      </div>
    </footer>
  );
}

const editableFields: EditableFieldDefinition[] = [
  { path: 'companyName', type: 'text', label: 'Company Name', validation: { required: true } },
  { path: 'tagline', type: 'text', label: 'Tagline' },
  { path: 'copyright', type: 'text', label: 'Copyright Text' },
  { path: 'backgroundColor', type: 'color', label: 'Background Color' },
  {
    path: 'links',
    type: 'array',
    label: 'Footer Links',
    itemFields: [
      { path: 'text', type: 'text', label: 'Link Text' },
      { path: 'url', type: 'url', label: 'Link URL' },
    ],
  },
  {
    path: 'socialLinks',
    type: 'array',
    label: 'Social Links',
    itemFields: [
      {
        path: 'platform',
        type: 'select',
        label: 'Platform',
        options: [
          { label: 'Facebook', value: 'facebook' },
          { label: 'Twitter', value: 'twitter' },
          { label: 'LinkedIn', value: 'linkedin' },
          { label: 'Instagram', value: 'instagram' },
          { label: 'YouTube', value: 'youtube' },
        ],
      },
      { path: 'url', type: 'url', label: 'Profile URL' },
    ],
  },
];

registerComponent({
  id: 'footer-simple',
  category: 'footer',
  name: 'Simple Footer',
  description: 'A simple footer with company info, links, and social icons',
  schema: FooterSimpleSchema,
  defaultProps: {
    companyName: 'Your Company',
    tagline: 'Building the future, one step at a time.',
    links: [
      { text: 'Privacy Policy', url: '/privacy' },
      { text: 'Terms of Service', url: '/terms' },
      { text: 'Contact', url: '/contact' },
    ],
    socialLinks: [
      { platform: 'twitter', url: 'https://twitter.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
    ],
    backgroundColor: '#0f172a',
  },
  component: FooterSimple,
  editableFields,
  tags: ['footer', 'navigation', 'social'],
});

export default FooterSimple;
