'use client';

import { useState, useEffect, useRef, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  History,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface EditOperation {
  type: string;
  sectionIndex?: number;
  path?: string;
  value?: unknown;
}

interface EditResponse {
  understood: boolean;
  interpretation: string;
  operations: EditOperation[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

interface EditResult {
  success: boolean;
  pageId: string;
  pageTitle: string;
  response?: EditResponse;
  preview?: unknown;
  original?: unknown;
  validation?: {
    valid: boolean;
    warnings: string[];
  };
  diffSummary?: string[];
  error?: string;
}

interface PageProps {
  params: Promise<{ siteId: string; token: string }>;
}

export default function MagicLinkEditPage({ params }: PageProps) {
  const { siteId, token } = use(params);

  const [request, setRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<EditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidLink, setIsValidLink] = useState<boolean | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [history, setHistory] = useState<Array<{ request: string; summary: string; timestamp: Date }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Validate magic link on mount
  useEffect(() => {
    async function validateLink() {
      try {
        const res = await fetch(`/api/sites/${siteId}/edit-natural`, {
          method: 'GET',
          headers: {
            'x-magic-token': token,
          },
        });

        if (res.ok) {
          setIsValidLink(true);
          // Get site info
          const siteRes = await fetch(`/api/sites/${siteId}`, {
            headers: { 'x-magic-token': token },
          });
          if (siteRes.ok) {
            const siteData = await siteRes.json();
            setSiteName(siteData.site?.name || 'Your Site');
          }
        } else {
          setIsValidLink(false);
          setError('This edit link is invalid or has expired.');
        }
      } catch {
        setIsValidLink(false);
        setError('Could not validate link. Please try again.');
      }
    }

    validateLink();
  }, [siteId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/edit-natural`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-magic-token': token,
        },
        body: JSON.stringify({ request: request.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result?.response || isApplying) return;

    setIsApplying(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/edit-natural`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-magic-token': token,
        },
        body: JSON.stringify({
          pageId: result.pageId,
          operations: result.response.operations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply changes');
      }

      // Success! Add to history and reset
      setHistory((prev) => [
        { request, summary: result.response!.summary, timestamp: new Date() },
        ...prev,
      ]);
      setRequest('');
      setResult(null);

      // Focus input for next edit
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    setResult(null);
    setRequest('');
    inputRef.current?.focus();
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading state
  if (isValidLink === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validating your edit link...</span>
        </div>
      </div>
    );
  }

  // Invalid link
  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Invalid Edit Link
          </h1>
          <p className="text-slate-600">
            {error || 'This link is no longer valid. Please contact the site owner for a new link.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Edit {siteName}</h1>
              <p className="text-xs text-slate-500">Type what you want to change</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            History
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {history.length}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <Card className="mb-6 p-4">
            <h3 className="font-medium text-slate-900 mb-3">Recent Changes</h3>
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 truncate">{item.summary}</p>
                    <p className="text-slate-400 text-xs">
                      {item.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Main Input */}
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What would you like to change?
            </label>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder='Try: "Change the headline to Welcome to Our New Store" or "Make the background blue" or "Add a testimonial from Sarah saying Great service!"'
                className="w-full min-h-[100px] p-4 pr-12 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                disabled={isLoading || !!result}
              />
              {!result && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!request.trim() || isLoading}
                  className="absolute right-2 bottom-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Error Display */}
        {error && !result && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Preview */}
        {result && result.response && (
          <Card className="p-6">
            {result.response.understood ? (
              <>
                {/* Interpretation */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        Preview
                      </span>
                      <Badge className={getRiskColor(result.response.riskLevel)}>
                        {result.response.riskLevel} risk
                      </Badge>
                    </div>
                    <p className="text-slate-600">{result.response.interpretation}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Summary */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">
                    Changes to be made:
                  </h4>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-3">
                    {result.response.summary}
                  </p>
                </div>

                {/* Diff Summary */}
                {result.diffSummary && result.diffSummary.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">
                      What will change:
                    </h4>
                    <ul className="space-y-1">
                      {result.diffSummary.map((diff, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="h-3 w-3 text-green-500" />
                          {diff}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {result.validation?.warnings && result.validation.warnings.length > 0 && (
                  <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      {result.validation.warnings.join(' ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="gap-2"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isApplying}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </>
            ) : (
              /* AI didn't understand */
              <div className="text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="font-medium text-slate-900 mb-2">
                  I didn't quite understand that
                </h3>
                <p className="text-slate-600 mb-4">
                  {result.response.interpretation}
                </p>
                <Button variant="outline" onClick={handleReject}>
                  Try Again
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Example Prompts */}
        {!result && !isLoading && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-slate-500 mb-3">
              Example requests:
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Change the headline to Welcome to Our Store',
                'Make the hero background dark blue',
                'Update the phone number to 555-123-4567',
                'Add a feature about 24/7 support',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setRequest(example)}
                  className="text-sm px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-sm border-t py-3">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-500">
          Powered by AI - Changes are reviewed before going live
        </div>
      </footer>
    </div>
  );
}
