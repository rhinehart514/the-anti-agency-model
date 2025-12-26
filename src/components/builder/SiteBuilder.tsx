'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageBuilder } from './PageBuilder';
import { PageList, type Page } from './PageList';
import { NavigationEditor, type NavItem } from './NavigationEditor';
import { Theme, defaultTheme } from '@/lib/themes';
import type { PageSection } from '@/lib/components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, Settings } from 'lucide-react';

interface SiteData {
  id: string;
  name: string;
  slug: string;
  theme: Theme;
  navigation: NavItem[];
  pages: PageData[];
}

interface PageData extends Page {
  sections: PageSection[];
}

interface SiteBuilderProps {
  initialSite: SiteData;
  onSavePage?: (pageId: string, sections: PageSection[], theme: Theme) => Promise<void>;
  onSaveNavigation?: (navigation: NavItem[]) => Promise<void>;
  onCreatePage?: (title: string, slug: string) => Promise<PageData>;
  onDeletePage?: (pageId: string) => Promise<void>;
  onDuplicatePage?: (pageId: string) => Promise<PageData>;
  onRenamePage?: (pageId: string, title: string, slug: string) => Promise<void>;
  onSetHomePage?: (pageId: string) => Promise<void>;
}

export function SiteBuilder({
  initialSite,
  onSavePage,
  onSaveNavigation,
  onCreatePage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onSetHomePage,
}: SiteBuilderProps) {
  const [site, setSite] = useState<SiteData>(initialSite);
  const [currentPageId, setCurrentPageId] = useState<string>(
    site.pages.find((p) => p.isHome)?.id || site.pages[0]?.id || ''
  );
  const [showPageList, setShowPageList] = useState(true);

  const currentPage = site.pages.find((p) => p.id === currentPageId);

  // Update current page sections locally
  const handlePageUpdate = (pageId: string, sections: PageSection[]) => {
    setSite((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId ? { ...p, sections } : p
      ),
    }));
  };

  // Handle save
  const handleSave = useCallback(
    async (sections: PageSection[], theme: Theme) => {
      if (!currentPageId || !onSavePage) return;

      // Update local state
      handlePageUpdate(currentPageId, sections);
      setSite((prev) => ({ ...prev, theme }));

      // Save to server
      await onSavePage(currentPageId, sections, theme);
    },
    [currentPageId, onSavePage]
  );

  // Handle navigation update
  const handleNavigationChange = useCallback(
    async (navigation: NavItem[]) => {
      setSite((prev) => ({ ...prev, navigation }));
      if (onSaveNavigation) {
        await onSaveNavigation(navigation);
      }
    },
    [onSaveNavigation]
  );

  // Handle page creation
  const handleCreatePage = useCallback(
    async (title: string, slug: string) => {
      if (!onCreatePage) return;

      const newPage = await onCreatePage(title, slug);
      setSite((prev) => ({
        ...prev,
        pages: [...prev.pages, newPage],
      }));
      setCurrentPageId(newPage.id);
    },
    [onCreatePage]
  );

  // Handle page deletion
  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (!onDeletePage) return;

      await onDeletePage(pageId);
      setSite((prev) => ({
        ...prev,
        pages: prev.pages.filter((p) => p.id !== pageId),
      }));

      // Select another page if the current one was deleted
      if (currentPageId === pageId) {
        const homePage = site.pages.find((p) => p.isHome && p.id !== pageId);
        setCurrentPageId(homePage?.id || site.pages[0]?.id || '');
      }
    },
    [onDeletePage, currentPageId, site.pages]
  );

  // Handle page duplication
  const handleDuplicatePage = useCallback(
    async (pageId: string) => {
      if (!onDuplicatePage) return;

      const newPage = await onDuplicatePage(pageId);
      setSite((prev) => ({
        ...prev,
        pages: [...prev.pages, newPage],
      }));
      setCurrentPageId(newPage.id);
    },
    [onDuplicatePage]
  );

  // Handle page rename
  const handleRenamePage = useCallback(
    async (pageId: string, title: string, slug: string) => {
      if (!onRenamePage) return;

      await onRenamePage(pageId, title, slug);
      setSite((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId ? { ...p, title, slug } : p
        ),
      }));
    },
    [onRenamePage]
  );

  // Handle set home page
  const handleSetHomePage = useCallback(
    async (pageId: string) => {
      if (!onSetHomePage) return;

      await onSetHomePage(pageId);
      setSite((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => ({
          ...p,
          isHome: p.id === pageId,
          slug: p.id === pageId ? '' : p.slug,
        })),
      }));
    },
    [onSetHomePage]
  );

  if (!currentPage) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No pages found</h2>
          <p className="text-gray-500 mb-4">Create your first page to get started</p>
          <Button onClick={() => handleCreatePage('Home', '')}>
            Create Home Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Site Header */}
      <div className="h-12 bg-slate-800 text-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <a
            href={`/sites/${site.slug}`}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Exit Builder</span>
          </a>
          <div className="w-px h-6 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{site.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavigationEditor
            items={site.navigation}
            pages={site.pages}
            onChange={handleNavigationChange}
          />
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page List Sidebar */}
        {showPageList && (
          <div className="w-56 shrink-0">
            <PageList
              pages={site.pages}
              currentPageId={currentPageId}
              siteSlug={site.slug}
              onSelectPage={setCurrentPageId}
              onCreatePage={handleCreatePage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onRenamePage={handleRenamePage}
              onSetHomePage={handleSetHomePage}
            />
          </div>
        )}

        {/* Page Builder */}
        <div className="flex-1">
          <PageBuilder
            key={currentPageId}
            initialSections={currentPage.sections}
            initialTheme={site.theme}
            onSave={handleSave}
            pageTitle={currentPage.title}
            siteSlug={site.slug}
          />
        </div>
      </div>
    </div>
  );
}

export default SiteBuilder;
