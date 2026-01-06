'use client';

import { z } from 'zod';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerComponent } from '@/lib/components/registry';
import type { EditableFieldDefinition } from '@/lib/components/types';

export const ContactSplitSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  hours: z.string().optional(),
  formTitle: z.string().optional(),
  submitButtonText: z.string().default('Send Message'),
  backgroundColor: z.string().optional(),
});

export type ContactSplitProps = z.infer<typeof ContactSplitSchema>;

export function ContactSplit({
  headline,
  subheadline,
  address,
  phone,
  email,
  hours,
  formTitle = 'Get In Touch',
  submitButtonText = 'Send Message',
  backgroundColor = '#ffffff',
}: ContactSplitProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission would be handled by the platform's form system
    console.log('Form submitted');
  };

  return (
    <section
      id="contact"
      className="py-16 lg:py-24"
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {headline}
            </h2>
            {subheadline && (
              <p className="text-lg text-gray-600 mb-8">
                {subheadline}
              </p>
            )}

            <div className="space-y-6">
              {address && (
                <div className="flex gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary-100, #dbeafe)' }}
                  >
                    <MapPin className="w-6 h-6" style={{ color: 'var(--color-primary-600, #2563eb)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                    <p className="text-gray-600 whitespace-pre-line">{address}</p>
                  </div>
                </div>
              )}

              {phone && (
                <div className="flex gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary-100, #dbeafe)' }}
                  >
                    <Phone className="w-6 h-6" style={{ color: 'var(--color-primary-600, #2563eb)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                    <a href={`tel:${phone}`} className="text-gray-600 hover:text-blue-600">
                      {phone}
                    </a>
                  </div>
                </div>
              )}

              {email && (
                <div className="flex gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary-100, #dbeafe)' }}
                  >
                    <Mail className="w-6 h-6" style={{ color: 'var(--color-primary-600, #2563eb)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                    <a href={`mailto:${email}`} className="text-gray-600 hover:text-blue-600">
                      {email}
                    </a>
                  </div>
                </div>
              )}

              {hours && (
                <div className="flex gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary-100, #dbeafe)' }}
                  >
                    <Clock className="w-6 h-6" style={{ color: 'var(--color-primary-600, #2563eb)' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Hours</h4>
                    <p className="text-gray-600 whitespace-pre-line">{hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {formTitle}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  id="name"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    id="phone"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="How can we help you?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: 'var(--color-primary-600, #2563eb)' }}
              >
                {submitButtonText}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

const editableFields: EditableFieldDefinition[] = [
  { path: 'headline', type: 'text', label: 'Headline', validation: { required: true } },
  { path: 'subheadline', type: 'richtext', label: 'Subheadline' },
  { path: 'address', type: 'richtext', label: 'Address' },
  { path: 'phone', type: 'text', label: 'Phone Number' },
  { path: 'email', type: 'email', label: 'Email Address' },
  { path: 'hours', type: 'richtext', label: 'Business Hours' },
  { path: 'formTitle', type: 'text', label: 'Form Title' },
  { path: 'submitButtonText', type: 'text', label: 'Submit Button Text' },
  { path: 'backgroundColor', type: 'color', label: 'Background Color' },
];

registerComponent({
  id: 'contact-split',
  category: 'contact',
  name: 'Split Contact',
  description: 'Contact section with info on left and form on right',
  schema: ContactSplitSchema,
  defaultProps: {
    headline: 'Get In Touch',
    subheadline: 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
    address: '123 Main Street\nSuite 100\nSan Francisco, CA 94102',
    phone: '(555) 123-4567',
    email: 'hello@example.com',
    hours: 'Monday - Friday: 9am - 5pm\nSaturday: 10am - 2pm',
    formTitle: 'Send Us a Message',
    submitButtonText: 'Send Message',
    backgroundColor: '#ffffff',
  },
  component: ContactSplit,
  editableFields,
  tags: ['contact', 'form', 'split'],
});

export default ContactSplit;
