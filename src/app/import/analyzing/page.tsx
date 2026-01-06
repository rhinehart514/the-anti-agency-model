'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  Globe,
  Sparkles,
  FileText,
} from 'lucide-react';
import type { ScrapedSiteData } from '@/lib/scraping/types';

type Step = 'scraping' | 'generating' | 'complete' | 'error';

interface AnalysisState {
  step: Step;
  progress: number;
  scraped: ScrapedSiteData | null;
  generated: {
    content: unknown;
    improvements: string[];
  } | null;
  error: string | null;
}

function AnalyzingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  const [state, setState] = useState<AnalysisState>({
    step: 'scraping',
    progress: 0,
    scraped: null,
    generated: null,
    error: null,
  });

  const runAnalysis = useCallback(async () => {
    if (!url) {
      setState((s) => ({ ...s, step: 'error', error: 'No URL provided' }));
      return;
    }

    try {
      // Step 1: Scrape the URL
      setState((s) => ({ ...s, step: 'scraping', progress: 20 }));

      const scrapeResponse = await fetch('/api/import/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!scrapeResponse.ok) {
        const error = await scrapeResponse.json();
        throw new Error(error.error || 'Failed to scrape website');
      }

      const scrapeResult = await scrapeResponse.json();
      setState((s) => ({ ...s, scraped: scrapeResult.data, progress: 50 }));

      // Step 2: Generate improved content
      setState((s) => ({ ...s, step: 'generating', progress: 70 }));

      const generateResponse = await fetch('/api/import/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scraped: scrapeResult.data,
        }),
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const generateResult = await generateResponse.json();
      setState((s) => ({
        ...s,
        generated: generateResult.data,
        progress: 100,
        step: 'complete',
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState((s) => ({ ...s, step: 'error', error: errorMessage }));
    }
  }, [url]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleContinue = () => {
    // Store the analysis data in session storage for the preview page
    sessionStorage.setItem(
      'importData',
      JSON.stringify({
        url,
        scraped: state.scraped,
        generated: state.generated,
      })
    );
    router.push('/import/preview');
  };

  const handleRetry = () => {
    setState({
      step: 'scraping',
      progress: 0,
      scraped: null,
      generated: null,
      error: null,
    });
    runAnalysis();
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'scraping':
        return <Globe className="h-5 w-5" />;
      case 'generating':
        return <Sparkles className="h-5 w-5" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getStepLabel = (step: Step) => {
    switch (step) {
      case 'scraping':
        return 'Analyzing your website...';
      case 'generating':
        return 'Generating improved content...';
      case 'complete':
        return 'Analysis complete!';
      case 'error':
        return 'Something went wrong';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              {getStepLabel(state.step)}
            </h1>
            {url && (
              <p className="text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                <Globe className="h-4 w-4" />
                {decodeURIComponent(url)}
              </p>
            )}
          </div>

          {/* Progress */}
          {state.step !== 'error' && state.step !== 'complete' && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Progress value={state.progress} className="h-2" />

                  <div className="grid grid-cols-3 gap-4">
                    {(['scraping', 'generating', 'complete'] as const).map(
                      (stepName, index) => {
                        const stepNumber = index + 1;
                        const isActive = state.step === stepName;
                        const isComplete =
                          ['scraping', 'generating', 'complete'].indexOf(
                            state.step
                          ) > index;

                        return (
                          <div
                            key={stepName}
                            className={`flex flex-col items-center text-center ${
                              isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : isComplete
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                isActive
                                  ? 'bg-blue-100 dark:bg-blue-900'
                                  : isComplete
                                    ? 'bg-green-100 dark:bg-green-900'
                                    : 'bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {isActive ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isComplete ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <span className="text-sm font-medium">{stepNumber}</span>
                              )}
                            </div>
                            <span className="text-xs font-medium capitalize">
                              {stepName === 'scraping'
                                ? 'Scrape'
                                : stepName === 'generating'
                                  ? 'Generate'
                                  : 'Done'}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {state.step === 'error' && (
            <Alert variant="destructive" className="mb-8">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Results Preview */}
          {state.step === 'complete' && state.generated && (
            <div className="space-y-6">
              {/* Success Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Generated Successfully
                  </CardTitle>
                  <CardDescription>
                    We've analyzed your website and created improved content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Business Info */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Business Detected
                      </div>
                      <div className="font-semibold text-lg">
                        {state.scraped?.business.name || 'Your Business'}
                      </div>
                      {state.scraped?.business.tagline && (
                        <div className="text-sm text-slate-500 mt-1">
                          {state.scraped.business.tagline}
                        </div>
                      )}
                    </div>

                    {/* Improvements Made */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Content Sections
                        </span>
                        <Badge variant="default">
                          {state.scraped?.content.services.length || 0} services
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Improvements Made
                        </span>
                        <Badge variant="default">
                          {state.generated?.improvements.length || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Improvements List */}
              {state.generated.improvements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Improvements Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {state.generated.improvements.map((improvement, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div className="text-sm">{improvement}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={handleRetry}>
                  Start Over
                </Button>
                <Button onClick={handleContinue} size="lg">
                  Preview Your New Site <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Error Actions */}
          {state.step === 'error' && (
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => router.push('/import')}>
                Try Different URL
              </Button>
              <Button onClick={handleRetry}>Retry</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AnalyzingContent />
    </Suspense>
  );
}
