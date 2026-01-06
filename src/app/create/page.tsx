'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles, Globe, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'describe' | 'import'>('describe');

  // Describe tab state
  const [description, setDescription] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Import tab state
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'description',
          description,
          businessName: businessName || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const generatedSite = await response.json();

      // Store in sessionStorage for the preview page
      sessionStorage.setItem('generatedSite', JSON.stringify(generatedSite));
      sessionStorage.setItem('siteEmail', email);

      router.push('/create/preview');
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate site. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;

    setIsImporting(true);

    try {
      // First scrape the URL
      const scrapeResponse = await fetch('/api/import/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      if (!scrapeResponse.ok) {
        throw new Error('Failed to scrape URL');
      }

      const scrapedData = await scrapeResponse.json();

      // Then generate improved version
      const generateResponse = await fetch('/api/ai/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'import',
          scrapedData,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Generation failed');
      }

      const generatedSite = await generateResponse.json();

      sessionStorage.setItem('generatedSite', JSON.stringify(generatedSite));
      sessionStorage.setItem('originalUrl', importUrl);

      router.push('/create/preview');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import site. Please check the URL and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Your Website
          </h1>
          <p className="text-muted-foreground">
            Describe what you need or import an existing site
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'describe' | 'import')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="describe" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Describe
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Globe className="h-4 w-4" />
              Import URL
            </TabsTrigger>
          </TabsList>

          {/* Describe Tab */}
          <TabsContent value="describe" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Describe your business or website
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="We're a boutique law firm in downtown Seattle specializing in family law and estate planning. We want a professional website that builds trust with potential clients..."
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about your business, services, and target audience
                </p>
              </div>

              {/* Collapsible additional details */}
              <button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showMoreDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Add more details (optional)
              </button>

              {showMoreDetails && (
                <div className="grid gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Business name
                    </label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Law Firm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Contact email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate My Site
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Paste your existing website URL
                </label>
                <Input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://your-current-website.com"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  We'll analyze your current site and generate an improved version
                </p>
              </div>

              <Button
                onClick={handleImport}
                disabled={!importUrl.trim() || isImporting}
                className="w-full"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Import & Improve
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Your content stays yours. We just make it better.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
