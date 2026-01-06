'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Plus,
  FileText,
  Home,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Page {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  isPublished: boolean;
  updatedAt: Date;
}

interface PageListProps {
  pages: Page[];
  currentPageId?: string;
  siteSlug?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (title: string, slug: string) => void;
  onDeletePage: (pageId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onRenamePage: (pageId: string, title: string, slug: string) => void;
  onSetHomePage: (pageId: string) => void;
}

export function PageList({
  pages,
  currentPageId,
  siteSlug,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onSetHomePage,
}: PageListProps) {
  const [isNewPageOpen, setIsNewPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  const handleCreatePage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/\s+/g, '-');
    onCreatePage(newPageTitle.trim(), slug);
    setNewPageTitle('');
    setNewPageSlug('');
    setIsNewPageOpen(false);
  };

  const handleRename = () => {
    if (!editingPage || !newPageTitle.trim()) return;
    const slug = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/\s+/g, '-');
    onRenamePage(editingPage.id, newPageTitle.trim(), slug);
    setEditingPage(null);
    setNewPageTitle('');
    setNewPageSlug('');
  };

  const openEditDialog = (page: Page) => {
    setEditingPage(page);
    setNewPageTitle(page.title);
    setNewPageSlug(page.slug);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="h-full flex flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Pages</h3>
        <Dialog open={isNewPageOpen} onOpenChange={setIsNewPageOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
              <DialogDescription>
                Add a new page to your site. The slug will be used in the URL.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Title</label>
                <Input
                  placeholder="About Us"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug(generateSlug(e.target.value));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    placeholder="about-us"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(generateSlug(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewPageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePage} disabled={!newPageTitle.trim()}>
                Create Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {pages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pages yet</p>
            <p className="text-xs">Click + to create one</p>
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
                currentPageId === page.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-foreground'
              )}
              onClick={() => onSelectPage(page.id)}
            >
              {page.isHome ? (
                <Home className="h-4 w-4 shrink-0" />
              ) : (
                <FileText className="h-4 w-4 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{page.title}</div>
                <div className="text-xs text-muted-foreground truncate">/{page.slug}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(page)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicatePage(page.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {siteSlug && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/sites/${siteSlug}${page.isHome ? '' : '/' + page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Page
                      </a>
                    </DropdownMenuItem>
                  )}
                  {!page.isHome && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onSetHomePage(page.id)}>
                        <Home className="h-4 w-4 mr-2" />
                        Set as Home
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => onDeletePage(page.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
            <DialogDescription>
              Update the page title and URL slug.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(generateSlug(e.target.value))}
                  disabled={editingPage?.isHome}
                />
              </div>
              {editingPage?.isHome && (
                <p className="text-xs text-muted-foreground">
                  Home page slug cannot be changed
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPage(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newPageTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PageList;
