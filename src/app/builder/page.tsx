'use client';

import { SiteBuilder } from '@/components/builder';
import type { PageSection } from '@/lib/components';
import { defaultTheme } from '@/lib/themes';
import type { NavItem, Page } from '@/components/builder';

// Demo data types
interface PageData extends Page {
  sections: PageSection[];
}

interface SiteData {
  id: string;
  name: string;
  slug: string;
  theme: typeof defaultTheme;
  navigation: NavItem[];
  pages: PageData[];
}

// Demo initial data
const demoSite: SiteData = {
  id: 'demo-site',
  name: 'My Demo Site',
  slug: 'demo-site',
  theme: defaultTheme,
  navigation: [
    { id: 'nav-1', label: 'Home', type: 'page', target: 'page-home' },
    { id: 'nav-2', label: 'About', type: 'page', target: 'page-about' },
    { id: 'nav-3', label: 'Services', type: 'page', target: 'page-services' },
    { id: 'nav-4', label: 'Contact', type: 'section', target: 'contact' },
  ],
  pages: [
    {
      id: 'page-home',
      title: 'Home',
      slug: '',
      isHome: true,
      isPublished: true,
      updatedAt: new Date(),
      sections: [
        {
          id: 'home-hero',
          componentId: 'hero-centered',
          orderIndex: 0,
          props: {
            headline: 'Build Your Platform',
            subheadline: 'Create stunning websites and applications with our drag-and-drop builder. No coding required.',
            primaryCta: {
              text: 'Get Started Free',
              url: '#signup',
            },
            secondaryCta: {
              text: 'Watch Demo',
              url: '#demo',
            },
            backgroundType: 'theme',
            textAlign: 'center',
          },
        },
        {
          id: 'home-features',
          componentId: 'features-grid',
          orderIndex: 1,
          props: {
            headline: 'Why Choose Us',
            subheadline: 'Everything you need to build professional websites',
            features: [
              {
                icon: 'Zap',
                title: 'Lightning Fast',
                description: 'Build and launch websites in minutes, not months.',
              },
              {
                icon: 'Shield',
                title: 'Secure by Default',
                description: 'Enterprise-grade security for all your sites.',
              },
              {
                icon: 'Paintbrush',
                title: 'Beautiful Themes',
                description: 'Choose from dozens of professionally designed themes.',
              },
            ],
            columns: 3,
          },
        },
      ],
    },
    {
      id: 'page-about',
      title: 'About Us',
      slug: 'about',
      isHome: false,
      isPublished: true,
      updatedAt: new Date(),
      sections: [
        {
          id: 'about-hero',
          componentId: 'hero-centered',
          orderIndex: 0,
          props: {
            headline: 'About Our Company',
            subheadline: 'We are passionate about making website building accessible to everyone.',
            backgroundType: 'theme',
            textAlign: 'center',
          },
        },
      ],
    },
    {
      id: 'page-services',
      title: 'Services',
      slug: 'services',
      isHome: false,
      isPublished: true,
      updatedAt: new Date(),
      sections: [
        {
          id: 'services-hero',
          componentId: 'hero-centered',
          orderIndex: 0,
          props: {
            headline: 'Our Services',
            subheadline: 'Comprehensive solutions for your online presence.',
            backgroundType: 'theme',
            textAlign: 'center',
          },
        },
      ],
    },
  ],
};

export default function BuilderPage() {
  // Demo handlers - in production these would make API calls
  const handleSavePage = async (pageId: string, sections: PageSection[]) => {
    console.log('Saving page:', pageId, sections);
  };

  const handleSaveNavigation = async (navigation: NavItem[]) => {
    console.log('Saving navigation:', navigation);
  };

  const handleCreatePage = async (title: string, slug: string): Promise<PageData> => {
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      title,
      slug,
      isHome: false,
      isPublished: false,
      updatedAt: new Date(),
      sections: [],
    };
    console.log('Creating page:', newPage);
    return newPage;
  };

  const handleDeletePage = async (pageId: string) => {
    console.log('Deleting page:', pageId);
  };

  const handleDuplicatePage = async (pageId: string): Promise<PageData> => {
    const originalPage = demoSite.pages.find((p) => p.id === pageId);
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      title: `${originalPage?.title} (Copy)`,
      slug: `${originalPage?.slug}-copy`,
      isHome: false,
      isPublished: false,
      updatedAt: new Date(),
      sections: originalPage?.sections || [],
    };
    console.log('Duplicating page:', newPage);
    return newPage;
  };

  const handleRenamePage = async (pageId: string, title: string, slug: string) => {
    console.log('Renaming page:', pageId, title, slug);
  };

  const handleSetHomePage = async (pageId: string) => {
    console.log('Setting home page:', pageId);
  };

  return (
    <SiteBuilder
      initialSite={demoSite}
      onSavePage={handleSavePage}
      onSaveNavigation={handleSaveNavigation}
      onCreatePage={handleCreatePage}
      onDeletePage={handleDeletePage}
      onDuplicatePage={handleDuplicatePage}
      onRenamePage={handleRenamePage}
      onSetHomePage={handleSetHomePage}
    />
  );
}
