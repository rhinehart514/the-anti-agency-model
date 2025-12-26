'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Star,
  Copy,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  is_primary: boolean;
  verified: boolean;
  ssl_status: string;
  dns_configured: boolean;
  verification_token: string;
  created_at: string;
}

interface DnsInstructions {
  verification: { type: string; name: string; value: string; description: string };
  cname: { type: string; name: string; value: string; description: string };
  apex: { type: string; name: string; values: string[]; description: string };
}

export default function DomainsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}/domains`);
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [siteId]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain');
      }

      setDomains([...domains, data.domain]);
      setDnsInstructions(data.dnsInstructions);
      setSelectedDomainId(data.domain.id);
      setNewDomain('');
    } catch (error: any) {
      setAddError(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingId(domainId);

    try {
      const response = await fetch(`/api/sites/${siteId}/domains/${domainId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.verified) {
        // Refresh domains list
        await fetchDomains();
        setSelectedDomainId(null);
        setDnsInstructions(null);
      } else {
        // Show verification failed message
        alert(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    setDeletingId(domainId);

    try {
      const response = await fetch(`/api/sites/${siteId}/domains/${domainId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDomains(domains.filter((d) => d.id !== domainId));
        if (selectedDomainId === domainId) {
          setSelectedDomainId(null);
          setDnsInstructions(null);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      await fetch(`/api/sites/${siteId}/domains/${domainId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      await fetchDomains();
    } catch (error) {
      console.error('Set primary error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Custom Domains</h1>
        <p className="text-gray-500">
          Connect your own domain to your site
        </p>
      </div>

      {/* Add Domain Form */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">Add a Domain</h2>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            className="flex-1"
          />
          <Button onClick={handleAddDomain} disabled={isAdding || !newDomain.trim()}>
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Domain
          </Button>
        </div>
        {addError && (
          <p className="text-red-500 text-sm mt-2">{addError}</p>
        )}
      </div>

      {/* DNS Instructions (shown after adding a domain) */}
      {dnsInstructions && selectedDomainId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Configure DNS Records
          </h3>

          <div className="space-y-4">
            {/* Verification Record */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Step 1: Verification (TXT)</span>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  Required
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {dnsInstructions.verification.description}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1">
                      {dnsInstructions.verification.name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dnsInstructions.verification.name)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Value:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                      {dnsInstructions.verification.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dnsInstructions.verification.value)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CNAME Record */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Step 2: CNAME Record</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  For subdomains
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {dnsInstructions.cname.description}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1">
                      {dnsInstructions.cname.name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dnsInstructions.cname.name)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Points to:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1">
                      {dnsInstructions.cname.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dnsInstructions.cname.value)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleVerifyDomain(selectedDomainId)}
                disabled={verifyingId === selectedDomainId}
              >
                {verifyingId === selectedDomainId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Verify Domain
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Domains List */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Connected Domains</h2>
        </div>

        {domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No custom domains connected yet</p>
            <p className="text-sm">Add a domain above to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {domains.map((domain) => (
              <div key={domain.id} className="p-4 flex items-center gap-4">
                {/* Domain Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{domain.domain}</span>
                    {domain.is_primary && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                        <Star className="w-3 h-3" />
                        Primary
                      </span>
                    )}
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-4">
                  {/* Verification Status */}
                  <div className="flex items-center gap-1.5">
                    {domain.verified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600">Pending</span>
                      </>
                    )}
                  </div>

                  {/* SSL Status */}
                  <div className="flex items-center gap-1.5">
                    <Shield
                      className={`w-4 h-4 ${
                        domain.ssl_status === 'active'
                          ? 'text-green-500'
                          : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        domain.ssl_status === 'active'
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      SSL
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!domain.verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDomainId(domain.id);
                        // Generate instructions for existing domain
                        setDnsInstructions({
                          verification: {
                            type: 'TXT',
                            name: `_verification.${domain.domain}`,
                            value: domain.verification_token,
                            description: 'Add this TXT record to verify ownership',
                          },
                          cname: {
                            type: 'CNAME',
                            name: domain.domain,
                            value: process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourdomain.com',
                            description: 'Point your domain to our servers',
                          },
                          apex: {
                            type: 'A',
                            name: '@',
                            values: ['76.76.21.21'],
                            description: 'For apex domains',
                          },
                        });
                      }}
                    >
                      Configure
                    </Button>
                  )}

                  {domain.verified && !domain.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(domain.id)}
                    >
                      Set Primary
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDomain(domain.id)}
                    disabled={deletingId === domain.id}
                  >
                    {deletingId === domain.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
