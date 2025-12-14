'use client'

import { EditableText } from '@/components/editor'
import { useEditMode } from '@/components/editor'

interface TeamMember {
  id: string
  name: string
  title: string
  image?: string
}

interface AboutSectionProps {
  headline: string
  description: string
  stats: Array<{ label: string; value: string }>
  team?: TeamMember[]
}

export function AboutSection({ headline, description, stats, team }: AboutSectionProps) {
  const { updateSection } = useEditMode()

  const handleStatChange = (index: number, field: 'label' | 'value', value: string) => {
    const updatedStats = stats.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    )
    updateSection('about', { stats: updatedStats })
  }

  return (
    <section id="about" className="section-padding bg-primary-50">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <EditableText
              value={headline}
              onChange={(value) => updateSection('about', { headline: value })}
              className="text-3xl md:text-4xl font-serif font-bold text-primary-900 mb-6"
              as="h2"
              aiContext={{ sectionType: 'about-headline' }}
            />
            <EditableText
              value={description}
              onChange={(value) => updateSection('about', { description: value })}
              className="text-lg text-primary-700 leading-relaxed mb-8"
              as="p"
              richText
              aiContext={{ sectionType: 'about-description' }}
            />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <div key={index}>
                  <EditableText
                    value={stat.value}
                    onChange={(v) => handleStatChange(index, 'value', v)}
                    className="text-3xl md:text-4xl font-bold text-accent-600 mb-2"
                    as="span"
                    aiContext={{ sectionType: 'stat-value' }}
                  />
                  <EditableText
                    value={stat.label}
                    onChange={(v) => handleStatChange(index, 'label', v)}
                    className="text-sm text-primary-600 uppercase tracking-wide"
                    as="span"
                    aiContext={{ sectionType: 'stat-label' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Team Grid */}
          {team && team.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {team.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="aspect-[3/4] bg-primary-200 relative">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="w-20 h-20 text-primary-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-primary-900">{member.name}</h4>
                    <p className="text-sm text-primary-600">{member.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
