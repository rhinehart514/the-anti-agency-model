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
import { Plus, Database, Settings, ExternalLink, Trash2 } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  collection_fields: any[];
  created_at: string;
}

export default function CollectionsPage({ params }: { params: { siteId: string } }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const response = await fetch(`/api/sites/${params.siteId}/collections`);
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, [params.siteId]);

  async function handleDelete(collectionId: string) {
    if (!confirm('Are you sure you want to delete this collection? All records will be lost.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sites/${params.siteId}/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCollections(collections.filter(c => c.id !== collectionId));
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">Manage your data collections</p>
        </div>
        <Button asChild>
          <Link href={`/admin/${params.siteId}/collections/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading collections...
          </CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No collections yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first collection to start storing data
            </p>
            <Button asChild>
              <Link href={`/admin/${params.siteId}/collections/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: collection.color || '#3b82f6' }}
                        >
                          <Database className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{collection.name}</div>
                          {collection.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {collection.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {collection.slug}
                    </TableCell>
                    <TableCell>
                      {collection.collection_fields?.length || 0} fields
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(collection.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/${params.siteId}/collections/${collection.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/${params.siteId}/collections/${collection.id}/settings`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(collection.id)}
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
