'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Copy,
  Trash2,
  Link,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface MagicLink {
  id: string;
  name: string;
  token: string;
  url: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  permissions: {
    canEditText: boolean;
    canEditColors: boolean;
    canEditImages: boolean;
    canAddSections: boolean;
    canRemoveSections: boolean;
    requiresApproval: boolean;
    maxEditsPerDay?: number;
  };
}

interface MagicLinksManagerProps {
  siteId: string;
}

export function MagicLinksManager({ siteId }: MagicLinksManagerProps) {
  const [links, setLinks] = useState<MagicLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkExpiry, setNewLinkExpiry] = useState<number | null>(30);
  const [newLinkPermissions, setNewLinkPermissions] = useState({
    canEditText: true,
    canEditColors: true,
    canEditImages: false,
    canAddSections: false,
    canRemoveSections: false,
    requiresApproval: false,
  });

  useEffect(() => {
    fetchLinks();
  }, [siteId]);

  const fetchLinks = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/magic-links`);
      if (!res.ok) throw new Error('Failed to fetch links');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links');
    } finally {
      setIsLoading(false);
    }
  };

  const createLink = async () => {
    if (!newLinkName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/magic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLinkName.trim(),
          expiresInDays: newLinkExpiry,
          permissions: newLinkPermissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create link');
      }

      const data = await res.json();
      setLinks((prev) => [data.magicLink, ...prev]);
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}/magic-links?linkId=${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to revoke link');

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link');
    }
  };

  const copyLink = async (link: MagicLink) => {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setNewLinkName('');
    setNewLinkExpiry(30);
    setNewLinkPermissions({
      canEditText: true,
      canEditColors: true,
      canEditImages: false,
      canAddSections: false,
      canRemoveSections: false,
      requiresApproval: false,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (link: MagicLink) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading magic links...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Magic Links</h2>
          <p className="text-sm text-slate-500">
            Let clients edit their site with natural language - no login required
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Magic Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-name">Link Name</Label>
                <Input
                  id="link-name"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g., Client Edit Access"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-expiry">Expires In (days)</Label>
                <Input
                  id="link-expiry"
                  type="number"
                  min={1}
                  max={365}
                  value={newLinkExpiry ?? ''}
                  onChange={(e) =>
                    setNewLinkExpiry(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Leave empty for no expiration"
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {[
                    { key: 'canEditText', label: 'Edit text content' },
                    { key: 'canEditColors', label: 'Change colors' },
                    { key: 'canEditImages', label: 'Upload images' },
                    { key: 'canAddSections', label: 'Add new sections' },
                    { key: 'canRemoveSections', label: 'Remove sections' },
                    { key: 'requiresApproval', label: 'Require approval for changes' },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{perm.label}</span>
                      <Switch
                        checked={newLinkPermissions[perm.key as keyof typeof newLinkPermissions]}
                        onCheckedChange={(checked) =>
                          setNewLinkPermissions((prev) => ({
                            ...prev,
                            [perm.key]: checked,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createLink} disabled={isCreating || !newLinkName.trim()}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create Link'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && !showCreateDialog && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </Card>
      )}

      {/* Links Table */}
      {links.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Link className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-medium text-slate-900 mb-1">No magic links yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Create a magic link to let clients edit their site without logging in.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first link
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900">{link.name}</div>
                      <div className="text-xs text-slate-500 font-mono truncate max-w-[200px]">
                        {link.token}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {!link.is_active ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : isExpired(link) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{link.usage_count}</span>
                      <span className="text-slate-500"> uses</span>
                    </div>
                    {link.last_used_at && (
                      <div className="text-xs text-slate-500">
                        Last: {formatDate(link.last_used_at)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(link.expires_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(link)}
                        disabled={!link.is_active || isExpired(link)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        disabled={!link.is_active || isExpired(link)}
                      >
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeLink(link.id)}
                        disabled={!link.is_active}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
