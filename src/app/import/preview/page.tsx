'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  Rocket,
  Eye,
  Palette,
  Settings,
  ExternalLink,
} from 'lucide-react';
import type { ScrapedSiteData } from '@/lib/scraping/types';

interface ImportData {
  url: string;
  scraped: ScrapedSiteData;
  generated: {
    content: unknown;
    improvements: string[];
  };
}

const COLOR_SCHEMES = [
  { id: 'default', name: 'Professional Blue', colors: ['#1e40af', '#3b82f6', '#93c5fd'] },
  { id: 'forest', name: 'Forest Green', colors: ['#14532d', '#22c55e', '#86efac'] },
  { id: 'sunset', name: 'Sunset Orange', colors: ['#7c2d12', '#f97316', '#fed7aa'] },
  { id: 'royal', name: 'Royal Purple', colors: ['#581c87', '#a855f7', '#e9d5ff'] },
  { id: 'slate', name: 'Modern Slate', colors: ['#1e293b', '#64748b', '#cbd5e1'] },
  { id: 'rose', name: 'Elegant Rose', colors: ['#881337', '#f43f5e', '#fecdd3'] },
];

export default function PreviewPage() {
  const router = useRouter();
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [siteName, setSiteName] = useState('');
  const [siteSlug, setSiteSlug] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('default');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ siteId: string; slug: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('importData');
    if (!stored) {
      router.push('/import');
      return;
    }

    try {
      const data = JSON.parse(stored) as ImportData;
      setImportData(data);

      // Set default site name from scraped data
      const businessName = data.scraped.business.name || 'My New Site';
      setSiteName(businessName);
      setSiteSlug(generateSlug(businessName));
    } catch {
      router.push('/import');
    }
  }, [router]);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const handleNameChange = (name: string) => {
    setSiteName(name);
    setSiteSlug(generateSlug(name));
  };

  const handleCreate = async () => {
    if (!importData || !siteName || !siteSlug) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/import/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          slug: siteSlug,
          content: importData.generated.content,
          colorScheme: selectedScheme,
          importData: {
            sourceUrl: importData.url,
            sourcePlatform: importData.scraped.platform,
            scrapedData: importData.scraped,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create site');
      }

      const result = await response.json();

      // Clear session storage
      sessionStorage.removeItem('importData');

      setSuccess({
        siteId: result.data.site.id,
        slug: result.data.site.slug,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setIsCreating(false);
    }
  };

  if (!importData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your Site is Ready!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              We've created your new site with all the improvements. Now let's make it yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" asChild>
                <a href={`/sites/${success.slug}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Site
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild>
                <a href={`/builder/${success.siteId}`}>
                  <Palette className="mr-2 h-4 w-4" />
                  Customize in Builder
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Preview & Customize</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Customization Panel */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Site Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={siteName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="My Business"
                    />
                  </div>
                  <div>
                    <Label htmlFor="siteSlug">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">sites/</span>
                      <Input
                        id="siteSlug"
                        value={siteSlug}
                        onChange={(e) =>
                          setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        }
                        placeholder="my-business"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Scheme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_SCHEMES.map((scheme) => (
                      <button
                        key={scheme.id}
                        onClick={() => setSelectedScheme(scheme.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedScheme === scheme.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          {scheme.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="text-xs font-medium text-left">{scheme.name}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCreate}
                disabled={isCreating || !siteName || !siteSlug}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                {isCreating ? 'Creating...' : 'Create My Site'}
              </Button>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Site Preview
                  </CardTitle>
                  <CardDescription>
                    This is how your new site will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="desktop" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="desktop">Desktop</TabsTrigger>
                      <TabsTrigger value="mobile">Mobile</TabsTrigger>
                    </TabsList>

                    <TabsContent value="desktop">
                      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                        {/* Simulated Browser Chrome */}
                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="flex-1 bg-white dark:bg-slate-900 rounded px-3 py-1 text-sm text-slate-500">
                            {siteSlug}.cursorfornormies.com
                          </div>
                        </div>

                        {/* Site Preview Content */}
                        <div className="p-6 min-h-[400px]">
                          {/* Hero Section Preview */}
                          <div className="text-center mb-8 pb-8 border-b">
                            <h1 className="text-2xl font-bold mb-2">
                              {importData.scraped.content.heroText || siteName}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                              {importData.scraped.content.heroSubtext ||
                                importData.scraped.business.tagline ||
                                'Your trusted partner for success'}
                            </p>
                            <Button
                              size="sm"
                              style={{
                                backgroundColor: COLOR_SCHEMES.find((s) => s.id === selectedScheme)
                                  ?.colors[1],
                              }}
                            >
                              {importData.scraped.content.ctaText || 'Get Started'}
                            </Button>
                          </div>

                          {/* Services Preview */}
                          {importData.scraped.content.services.length > 0 && (
                            <div className="mb-8">
                              <h2 className="text-lg font-semibold mb-4">Our Services</h2>
                              <div className="grid grid-cols-2 gap-4">
                                {importData.scraped.content.services.slice(0, 4).map((service, i) => (
                                  <div
                                    key={i}
                                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                                  >
                                    <div className="font-medium text-sm">{service}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Contact Preview */}
                          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                            {importData.scraped.business.phone && (
                              <p>{importData.scraped.business.phone}</p>
                            )}
                            {importData.scraped.business.email && (
                              <p>{importData.scraped.business.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="mobile">
                      <div className="max-w-[320px] mx-auto border rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950 shadow-xl">
                        {/* Phone Notch */}
                        <div className="bg-black h-8 flex items-end justify-center pb-1">
                          <div className="w-20 h-5 bg-black rounded-b-xl" />
                        </div>

                        {/* Mobile Content */}
                        <div className="p-4 min-h-[500px]">
                          <div className="text-center mb-6">
                            <h1 className="text-lg font-bold mb-2">
                              {importData.scraped.content.heroText || siteName}
                            </h1>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                              {importData.scraped.business.tagline || 'Your trusted partner'}
                            </p>
                            <Button
                              size="sm"
                              className="text-xs"
                              style={{
                                backgroundColor: COLOR_SCHEMES.find((s) => s.id === selectedScheme)
                                  ?.colors[1],
                              }}
                            >
                              {importData.scraped.content.ctaText || 'Get Started'}
                            </Button>
                          </div>

                          {importData.scraped.content.services.slice(0, 3).map((service, i) => (
                            <div
                              key={i}
                              className="p-2 mb-2 bg-slate-50 dark:bg-slate-800 rounded text-xs"
                            >
                              {service}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
