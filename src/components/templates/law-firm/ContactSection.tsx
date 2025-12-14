'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { EditableText } from '@/components/editor'
import { useEditMode } from '@/components/editor'

interface ContactInfo {
  address: string
  phone: string
  email: string
  hours: string
}

interface ContactSectionProps {
  headline: string
  subheadline: string
  contactInfo: ContactInfo
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export function ContactSection({ headline, subheadline, contactInfo }: ContactSectionProps) {
  const { updateSection } = useEditMode()
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [formStatus, setFormStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleContactInfoChange = (field: keyof ContactInfo, value: string) => {
    updateSection('contact', {
      contactInfo: { ...contactInfo, [field]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch(`/api/sites/${siteSlug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setFormStatus('success')
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch (error) {
      setFormStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <section id="contact" className="section-padding bg-white">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <EditableText
              value={headline}
              onChange={(value) => updateSection('contact', { headline: value })}
              className="text-3xl md:text-4xl font-serif font-bold text-primary-900 mb-4"
              as="h2"
              aiContext={{ sectionType: 'contact-headline' }}
            />
            <EditableText
              value={subheadline}
              onChange={(value) => updateSection('contact', { subheadline: value })}
              className="text-lg text-primary-600 mb-8"
              as="p"
              aiContext={{ sectionType: 'contact-subheadline' }}
            />

            <div className="space-y-6">
              {/* Address */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1">Address</h4>
                  <EditableText
                    value={contactInfo.address}
                    onChange={(v) => handleContactInfoChange('address', v)}
                    className="text-primary-600 whitespace-pre-line"
                    as="p"
                    aiContext={{ sectionType: 'contact-address' }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1">Phone</h4>
                  <EditableText
                    value={contactInfo.phone}
                    onChange={(v) => handleContactInfoChange('phone', v)}
                    className="text-primary-600"
                    as="span"
                    aiContext={{ sectionType: 'contact-phone' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1">Email</h4>
                  <EditableText
                    value={contactInfo.email}
                    onChange={(v) => handleContactInfoChange('email', v)}
                    className="text-primary-600"
                    as="span"
                    aiContext={{ sectionType: 'contact-email' }}
                  />
                </div>
              </div>

              {/* Hours */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1">Hours</h4>
                  <EditableText
                    value={contactInfo.hours}
                    onChange={(v) => handleContactInfoChange('hours', v)}
                    className="text-primary-600 whitespace-pre-line"
                    as="p"
                    aiContext={{ sectionType: 'contact-hours' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-primary-50 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-primary-900 mb-6">
              Request a Consultation
            </h3>

            {formStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-primary-900 mb-2">Message Sent!</h4>
                <p className="text-primary-600 mb-6">
                  Thank you for reaching out. We&apos;ll be in touch soon.
                </p>
                <button
                  onClick={() => setFormStatus('idle')}
                  className="text-primary-700 hover:text-primary-900 font-medium underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {formStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-primary-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
                    disabled={formStatus === 'submitting'}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
                      disabled={formStatus === 'submitting'}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-primary-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
                      disabled={formStatus === 'submitting'}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-primary-700 mb-2">
                    How can we help you?
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors resize-none"
                    disabled={formStatus === 'submitting'}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formStatus === 'submitting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
