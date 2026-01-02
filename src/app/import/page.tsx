'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

export default function ImportPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate URL
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Please enter a valid website URL');
      return;
    }

    setIsLoading(true);

    // Encode URL and navigate to analysis page
    const encodedUrl = encodeURIComponent(validUrl);
    router.push(`/import/analyzing?url=${encodedUrl}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Fire Your Marketing Agency
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Paste your website URL and watch us build you something better in minutes.
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Enter Your Website URL</CardTitle>
              <CardDescription>
                We'll analyze your current site and create an improved version automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="www.yourbusiness.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 h-12 text-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 px-6"
                    disabled={isLoading || !url.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Analyze <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>

          {/* What We'll Do */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-800/50">
              <CardContent className="pt-6">
                <div className="rounded-full w-12 h-12 bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Instant Analysis</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  We scan your site for SEO issues, mobile problems, and conversion blockers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-800/50">
              <CardContent className="pt-6">
                <div className="rounded-full w-12 h-12 bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered Rewrite</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Our AI improves your content to convert more visitors into customers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-800/50">
              <CardContent className="pt-6">
                <div className="rounded-full w-12 h-12 bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Built-In Automation</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Get leads automatically with forms, follow-ups, and booking built in.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust Signals */}
          <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>No credit card required. Cancel anytime. Your data is secure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
