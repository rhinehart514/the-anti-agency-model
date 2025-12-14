'use client'

import { EditableText } from '@/components/editor'
import { useEditMode } from '@/components/editor'

interface Service {
  id: string
  title: string
  description: string
  icon: string
}

interface ServicesSectionProps {
  headline: string
  subheadline: string
  services: Service[]
}

const iconMap: Record<string, JSX.Element> = {
  scale: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  briefcase: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  home: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  shield: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  document: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

export function ServicesSection({ headline, subheadline, services }: ServicesSectionProps) {
  const { updateSection } = useEditMode()

  const handleServiceChange = (serviceId: string, field: 'title' | 'description', value: string) => {
    const updatedServices = services.map(s =>
      s.id === serviceId ? { ...s, [field]: value } : s
    )
    updateSection('services', { services: updatedServices })
  }

  return (
    <section id="services" className="section-padding bg-white">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center mb-16">
          <EditableText
            value={headline}
            onChange={(value) => updateSection('services', { headline: value })}
            className="text-3xl md:text-4xl font-serif font-bold text-primary-900 mb-4"
            as="h2"
            aiContext={{ sectionType: 'services-headline' }}
          />
          <EditableText
            value={subheadline}
            onChange={(value) => updateSection('services', { subheadline: value })}
            className="text-lg text-primary-600 max-w-2xl mx-auto"
            as="p"
            aiContext={{ sectionType: 'services-subheadline' }}
          />
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="group p-8 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors duration-300"
            >
              <div className="w-16 h-16 bg-primary-800 text-white rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent-500 transition-colors duration-300">
                {iconMap[service.icon] || iconMap.scale}
              </div>
              <EditableText
                value={service.title}
                onChange={(v) => handleServiceChange(service.id, 'title', v)}
                className="text-xl font-semibold text-primary-900 mb-3"
                as="h3"
                aiContext={{ sectionType: 'service-title' }}
              />
              <EditableText
                value={service.description}
                onChange={(v) => handleServiceChange(service.id, 'description', v)}
                className="text-primary-600 leading-relaxed"
                as="p"
                aiContext={{ sectionType: 'service-description' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
