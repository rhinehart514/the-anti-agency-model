'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface SiteEdit {
  id: string;
  site_id: string;
  page_id: string;
  request: string;
  operations: unknown[];
  risk_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'applied' | 'rejected';
  access_type: 'owner' | 'magic_link';
  original_content: unknown;
  proposed_content: unknown;
  created_at: string;
  applied_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

interface PendingEditsManagerProps {
  siteId: string;
}

export function PendingEditsManager({ siteId }: PendingEditsManagerProps) {
  const [edits, setEdits] = useState<SiteEdit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdit, setSelectedEdit] = useState<SiteEdit | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchEdits();
  }, [siteId]);

  const fetchEdits = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/edit-natural?status=pending`);
      if (!res.ok) throw new Error('Failed to fetch edits');
      const data = await res.json();
      setEdits(data.edits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load edits');
    } finally {
      setIsLoading(false);
    }
  };

  const approveEdit = async (edit: SiteEdit) => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/edit-natural`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: edit.page_id,
          operations: edit.operations,
          editId: edit.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to approve edit');

      setEdits((prev) => prev.filter((e) => e.id !== edit.id));
      setSelectedEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve edit');
    } finally {
      setIsApproving(false);
    }
  };

  const rejectEdit = async (edit: SiteEdit, reason?: string) => {
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/edits/${edit.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) throw new Error('Failed to reject edit');

      setEdits((prev) => prev.filter((e) => e.id !== edit.id));
      setSelectedEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject edit');
    } finally {
      setIsRejecting(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pending edits...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pending Edits</h2>
        <p className="text-sm text-slate-500">
          Review and approve changes made by clients via magic links
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {edits.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-medium text-slate-900 mb-1">All caught up!</h3>
          <p className="text-sm text-slate-500">
            No pending edits require your approval.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {edits.map((edit) => (
            <Card
              key={edit.id}
              className="p-4 hover:border-slate-300 transition-colors cursor-pointer"
              onClick={() => setSelectedEdit(edit)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {edit.request}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(edit.created_at)}
                    <span className="text-slate-300">|</span>
                    <Badge variant="secondary" className="text-xs">
                      via magic link
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(edit.risk_level)}>
                    {edit.risk_level}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEdit} onOpenChange={() => setSelectedEdit(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEdit && (
            <>
              <DialogHeader>
                <DialogTitle>Review Edit Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Request */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Client Request
                  </label>
                  <p className="mt-1 p-3 bg-slate-50 rounded-lg text-slate-900">
                    "{selectedEdit.request}"
                  </p>
                </div>

                {/* Risk Level */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Risk Level:
                  </label>
                  <Badge className={getRiskColor(selectedEdit.risk_level)}>
                    {selectedEdit.risk_level}
                  </Badge>
                </div>

                <Separator />

                {/* Operations Summary */}
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Changes to be made
                  </label>
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-2">
                    {(selectedEdit.operations as { type: string; path?: string; value?: unknown }[]).map(
                      (op, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-slate-700 flex items-start gap-2"
                        >
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>
                            <span className="font-medium capitalize">
                              {op.type.replace('_', ' ')}
                            </span>
                            {op.path && (
                              <span className="text-slate-500"> at {op.path}</span>
                            )}
                            {typeof op.value === 'string' && op.value && (
                              <span className="text-slate-600">
                                : &quot;{op.value.slice(0, 50)}
                                {op.value.length > 50 ? '...' : ''}&quot;
                              </span>
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Warnings for high risk */}
                {selectedEdit.risk_level === 'high' && (
                  <Card className="p-3 border-yellow-200 bg-yellow-50">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>High risk change.</strong> This edit makes significant
                        structural changes. Please review carefully before approving.
                      </div>
                    </div>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    onClick={() => approveEdit(selectedEdit)}
                    disabled={isApproving || isRejecting}
                    className="gap-2"
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve & Apply
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectEdit(selectedEdit)}
                    disabled={isApproving || isRejecting}
                    className="gap-2"
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEdit(null)}
                    disabled={isApproving || isRejecting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
