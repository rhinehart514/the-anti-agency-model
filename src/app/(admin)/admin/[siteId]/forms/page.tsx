'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FormInput, Settings, ExternalLink, Trash2, Inbox } from 'lucide-react';

interface Form {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  form_fields: any[];
  submissionCount: number;
  created_at: string;
}

export default function FormsPage({ params }: { params: { siteId: string } }) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForms() {
      try {
        const response = await fetch(`/api/sites/${params.siteId}/forms`);
        const data = await response.json();
        setForms(data.forms || []);
      } catch (error) {
        console.error('Error fetching forms:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, [params.siteId]);

  async function handleDelete(formId: string) {
    if (!confirm('Are you sure you want to delete this form? All submissions will be lost.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sites/${params.siteId}/forms/${formId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setForms(forms.filter(f => f.id !== formId));
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-600">Create and manage forms for your site</p>
        </div>
        <Button asChild>
          <Link href={`/admin/${params.siteId}/forms/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading forms...
          </CardContent>
        </Card>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FormInput className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No forms yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first form to collect submissions
            </p>
            <Button asChild>
              <Link href={`/admin/${params.siteId}/forms/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{form.name}</div>
                        {form.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {form.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {form.slug}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[form.status]}>
                        {form.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {form.form_fields?.length || 0} fields
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/${params.siteId}/forms/${form.id}/submissions`}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Inbox className="h-4 w-4" />
                        {form.submissionCount}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(form.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/${params.siteId}/forms/${form.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/${params.siteId}/forms/${form.id}/settings`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(form.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
