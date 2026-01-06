'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  FormInput,
  Database,
} from 'lucide-react';

interface DashboardStats {
  pages: number;
  users: number;
  orders: number;
  revenue: number;
  pageViews: number;
  formSubmissions: number;
  collections: number;
  products: number;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'signup' | 'submission' | 'page_view';
  description: string;
  timestamp: string;
}

export default function AdminDashboard({ params }: { params: { siteId: string } }) {
  const [stats, setStats] = useState<DashboardStats>({
    pages: 0,
    users: 0,
    orders: 0,
    revenue: 0,
    pageViews: 0,
    formSubmissions: 0,
    collections: 0,
    products: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch stats from multiple endpoints
        const [pagesRes, usersRes, ordersRes, formsRes, collectionsRes, productsRes, analyticsRes] = await Promise.all([
          fetch(`/api/sites/${params.siteId}/pages`),
          fetch(`/api/sites/${params.siteId}/users`),
          fetch(`/api/sites/${params.siteId}/orders`),
          fetch(`/api/sites/${params.siteId}/forms`),
          fetch(`/api/sites/${params.siteId}/collections`),
          fetch(`/api/sites/${params.siteId}/products`),
          fetch(`/api/sites/${params.siteId}/analytics/summary?period=30d`),
        ]);

        const [pagesData, usersData, ordersData, formsData, collectionsData, productsData, analyticsData] = await Promise.all([
          pagesRes.json().catch(() => ({ pages: [] })),
          usersRes.json().catch(() => ({ users: [] })),
          ordersRes.json().catch(() => ({ orders: [], pagination: { total: 0 } })),
          formsRes.json().catch(() => ({ forms: [] })),
          collectionsRes.json().catch(() => ({ collections: [] })),
          productsRes.json().catch(() => ({ products: [], pagination: { total: 0 } })),
          analyticsRes.json().catch(() => ({ summary: { pageViews: 0, formSubmissions: 0 } })),
        ]);

        // Calculate revenue
        const revenue = (ordersData.orders || []).reduce(
          (sum: number, order: any) => sum + (order.total || 0),
          0
        );

        // Get analytics data
        const pageViews = analyticsData.summary?.pageViews || 0;
        const analyticsFormSubmissions = analyticsData.summary?.formSubmissions || 0;

        // Calculate form submissions (fallback to counting from forms if analytics not available)
        const formSubmissions = analyticsFormSubmissions || (formsData.forms || []).reduce(
          (sum: number, form: any) => sum + (form.submissionCount || 0),
          0
        );

        setStats({
          pages: pagesData.pages?.length || 0,
          users: usersData.users?.length || usersData.pagination?.total || 0,
          orders: ordersData.pagination?.total || ordersData.orders?.length || 0,
          revenue,
          pageViews,
          formSubmissions,
          collections: collectionsData.collections?.length || 0,
          products: productsData.pagination?.total || productsData.products?.length || 0,
        });

        // Create recent activity from latest data
        const activity: RecentActivity[] = [];

        (ordersData.orders || []).slice(0, 3).forEach((order: any) => {
          activity.push({
            id: order.id,
            type: 'order',
            description: `New order #${order.order_number} - $${order.total?.toFixed(2)}`,
            timestamp: order.created_at,
          });
        });

        (usersData.users || []).slice(0, 3).forEach((user: any) => {
          activity.push({
            id: user.id,
            type: 'signup',
            description: `New user signed up: ${user.email}`,
            timestamp: user.created_at,
          });
        });

        // Sort by timestamp
        activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivity(activity.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [params.siteId]);

  const statCards = [
    { label: 'Total Pages', value: stats.pages, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Site Users', value: stats.users, icon: Users, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Revenue', value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Page Views', value: stats.pageViews, icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { label: 'Form Submissions', value: stats.formSubmissions, icon: FormInput, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    { label: 'Collections', value: stats.collections, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Products', value: stats.products, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your site's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'order' ? 'bg-purple-500/20' :
                      activity.type === 'signup' ? 'bg-green-500/20' :
                      activity.type === 'submission' ? 'bg-pink-500/20' :
                      'bg-orange-500/20'
                    }`}>
                      {activity.type === 'order' && <ShoppingCart className="h-4 w-4 text-purple-400" />}
                      {activity.type === 'signup' && <Users className="h-4 w-4 text-green-400" />}
                      {activity.type === 'submission' && <FormInput className="h-4 w-4 text-pink-400" />}
                      {activity.type === 'page_view' && <Eye className="h-4 w-4 text-orange-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <a
                href={`/admin/${params.siteId}/pages/new`}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <FileText className="h-6 w-6 text-blue-400" />
                <span className="text-sm font-medium text-foreground">New Page</span>
              </a>
              <a
                href={`/admin/${params.siteId}/collections/new`}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <Database className="h-6 w-6 text-cyan-400" />
                <span className="text-sm font-medium text-foreground">New Collection</span>
              </a>
              <a
                href={`/admin/${params.siteId}/forms/new`}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-pink-400 hover:bg-pink-500/10 transition-colors"
              >
                <FormInput className="h-6 w-6 text-pink-400" />
                <span className="text-sm font-medium text-foreground">New Form</span>
              </a>
              <a
                href={`/admin/${params.siteId}/commerce/products/new`}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-purple-400 hover:bg-purple-500/10 transition-colors"
              >
                <ShoppingCart className="h-6 w-6 text-purple-400" />
                <span className="text-sm font-medium text-foreground">New Product</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
