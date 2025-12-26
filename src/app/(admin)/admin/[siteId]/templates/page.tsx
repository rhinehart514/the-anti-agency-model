'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layout,
  Search,
  Filter,
  Star,
  Download,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Package,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  preview_url: string;
  price: number;
  install_count: number;
  rating_average: number;
  rating_count: number;
}

export default function TemplatesPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('sort', sortBy);

      const response = await fetch(`/api/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, sortBy]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchTemplates();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleInstall = async (templateId: string) => {
    if (!confirm('This will replace your current site content. Continue?')) {
      return;
    }

    setInstallingId(templateId);

    try {
      const response = await fetch(`/api/templates/${templateId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          options: {
            replacePages: true,
            replaceTheme: true,
            replaceSettings: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInstalledIds(new Set([...installedIds, templateId]));
        alert('Template installed successfully!');
      } else if (response.status === 402) {
        alert(`This is a premium template. Price: $${data.price}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Install error:', error);
      alert('Failed to install template: ' + error.message);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Template Marketplace</h1>
        <p className="text-gray-500">
          Browse and install templates to jumpstart your site
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No templates found
          </h2>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try a different search term'
              : 'Check back later for new templates'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isInstalling={installingId === template.id}
              isInstalled={installedIds.has(template.id)}
              onInstall={() => handleInstall(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  isInstalling,
  isInstalled,
  onInstall,
}: {
  template: Template;
  isInstalling: boolean;
  isInstalled: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layout className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Preview Button */}
        {template.preview_url && (
          <a
            href={template.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Price Badge */}
        {template.price > 0 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
            ${template.price}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{template.name}</h3>

        {template.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">
            {template.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{template.install_count}</span>
          </div>

          {template.rating_count > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>
                {template.rating_average.toFixed(1)} ({template.rating_count})
              </span>
            </div>
          )}

          {template.category && (
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
              {template.category}
            </span>
          )}
        </div>

        {/* Install Button */}
        <Button
          onClick={onInstall}
          disabled={isInstalling || isInstalled}
          className="w-full"
          variant={isInstalled ? 'outline' : 'default'}
        >
          {isInstalling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing...
            </>
          ) : isInstalled ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Installed
            </>
          ) : template.price > 0 ? (
            `Buy & Install - $${template.price}`
          ) : (
            'Install Template'
          )}
        </Button>
      </div>
    </div>
  );
}
