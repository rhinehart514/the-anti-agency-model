'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Check,
  Loader2,
  Paintbrush,
  Eye,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeProvider, defaultTheme, themePresets, type Theme } from '@/lib/themes';
import { getReactComponent } from '@/lib/components';
import type { GeneratedSite } from '@/app/api/ai/generate-site/route';

// Import sections to register them
import '@/components/sections';

interface SectionWithId {
  id: string;
  orderIndex: number;
  componentId: string;
  props: Record<string, unknown>;
}

export default function PreviewPage() {
  const router = useRouter();
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null);
  const [sections, setSections] = useState<SectionWithId[]>([]);
  const [siteName, setSiteName] = useState('');
  const [siteSlug, setSlug] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(defaultTheme);
  const [isCreating, setIsCreating] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load generated site from sessionStorage
    const stored = sessionStorage.getItem('generatedSite');
    if (!stored) {
      router.push('/create');
      return;
    }

    try {
      const site = JSON.parse(stored) as GeneratedSite;
      setGeneratedSite(site);
      setSiteName(site.siteMeta.name);
      setSlug(generateSlug(site.siteMeta.name));

      // Add IDs to sections if they don't have them
      const sectionsWithIds = site.sections.map((section, index) => ({
        ...section,
        id: (section as any).id || `section-${Date.now()}-${index}`,
        orderIndex: index,
      }));
      setSections(sectionsWithIds);
    } catch {
      router.push('/create');
    }
  }, [router]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setSiteName(name);
    setSlug(generateSlug(name));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => (s.orderIndex = i));
    setSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    newSections.forEach((s, i) => (s.orderIndex = i));
    setSections(newSections);
  };

  const handleCreateSite = async () => {
    if (!siteName.trim() || !siteSlug.trim()) {
      setError('Please enter a site name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create the site
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          slug: siteSlug,
          settings: {
            theme: selectedTheme,
          },
          initialContent: {
            sections: sections.map(({ id, orderIndex, componentId, props }) => ({
              id,
              orderIndex,
              componentId,
              props,
            })),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create site');
      }

      const site = await response.json();

      // Clear session storage
      sessionStorage.removeItem('generatedSite');
      sessionStorage.removeItem('siteEmail');
      sessionStorage.removeItem('originalUrl');

      // Redirect to the new site dashboard
      router.push(`/admin/${site.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setIsCreating(false);
    }
  };

  if (!generatedSite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>

            <div className="flex-1 max-w-md">
              <Input
                value={siteName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Site name"
                className="text-center font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThemes(!showThemes)}
                className="gap-2"
              >
                <Paintbrush className="h-4 w-4" />
                Theme
              </Button>

              <Button
                onClick={handleCreateSite}
                disabled={isCreating}
                size="sm"
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Site
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Theme selector dropdown */}
        {showThemes && (
          <div className="border-t border-border bg-card/95 backdrop-blur px-4 py-3">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {themePresets.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme);
                      setShowThemes(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors shrink-0',
                      selectedTheme.id === theme.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.primary[500] }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.accent[500] }}
                      />
                    </div>
                    <span className="text-sm font-medium">{theme.name}</span>
                    {selectedTheme.id === theme.id && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Preview Canvas */}
      <div className="pb-8">
        <ThemeProvider theme={selectedTheme}>
          <div className="bg-white min-h-screen">
            {sections.map((section, index) => {
              const Component = getReactComponent(section.componentId);
              if (!Component) return null;

              return (
                <div key={section.id} className="relative group">
                  {/* Section controls */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1">
                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <div className="w-px h-5 bg-border" />
                      <button
                        onClick={() => handleDeleteSection(index)}
                        className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded"
                        title="Delete section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section content */}
                  <Component {...section.props} />
                </div>
              );
            })}
          </div>
        </ThemeProvider>
      </div>
    </div>
  );
}
