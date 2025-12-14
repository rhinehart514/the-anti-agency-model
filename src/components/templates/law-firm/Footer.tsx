'use client'

import { EditableText } from '@/components/editor'
import { useEditMode } from '@/components/editor'

interface FooterProps {
  firmName: string
  tagline: string
  contactInfo: {
    phone: string
    email: string
    address: string
  }
}

export function Footer({ firmName, tagline, contactInfo }: FooterProps) {
  const { updateSection } = useEditMode()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primary-900 text-white">
      <div className="container-wide section-padding py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <EditableText
              value={firmName}
              onChange={(value) => updateSection('footer', { firmName: value })}
              className="text-2xl font-serif font-bold mb-4"
              as="h3"
              aiContext={{ sectionType: 'footer-firmname' }}
            />
            <EditableText
              value={tagline}
              onChange={(value) => updateSection('footer', { tagline: value })}
              className="text-primary-300 mb-6 max-w-md"
              as="p"
              aiContext={{ sectionType: 'footer-tagline' }}
            />
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center hover:bg-accent-500 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center hover:bg-accent-500 transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#services" className="text-primary-300 hover:text-white transition-colors">
                  Practice Areas
                </a>
              </li>
              <li>
                <a href="#about" className="text-primary-300 hover:text-white transition-colors">
                  Our Team
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-primary-300 hover:text-white transition-colors">
                  Testimonials
                </a>
              </li>
              <li>
                <a href="#contact" className="text-primary-300 hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-primary-300">
              <li>
                <a href={`tel:${contactInfo.phone}`} className="hover:text-white transition-colors">
                  {contactInfo.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors">
                  {contactInfo.email}
                </a>
              </li>
              <li className="whitespace-pre-line">{contactInfo.address}</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-400 text-sm">
            &copy; {currentYear} {firmName}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-primary-400">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
