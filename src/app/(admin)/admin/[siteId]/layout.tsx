'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Database,
  FormInput,
  ShoppingCart,
  Users,
  Workflow,
  Settings,
  Paintbrush,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: { siteId: string };
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '' },
  { icon: FileText, label: 'Pages', href: '/pages' },
  { icon: Database, label: 'Collections', href: '/collections' },
  { icon: FormInput, label: 'Forms', href: '/forms' },
  { icon: ShoppingCart, label: 'Commerce', href: '/commerce' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: Workflow, label: 'Workflows', href: '/workflows' },
  { icon: Paintbrush, label: 'Theme', href: '/theme' },
  { icon: Globe, label: 'Domains', href: '/domains' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const pathname = usePathname();
  const basePath = `/admin/${params.siteId}`;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Back to Sites</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = item.href === ''
              ? pathname === basePath
              : pathname.startsWith(href);

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/sites/${params.siteId}`} target="_blank">
              <Globe className="h-4 w-4 mr-2" />
              View Site
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
