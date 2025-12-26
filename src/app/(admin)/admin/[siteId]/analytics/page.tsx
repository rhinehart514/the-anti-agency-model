'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  Eye,
  MousePointer,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react';

interface AnalyticsStats {
  totalPageViews: number;
  uniqueSessions: number;
  uniqueVisitors: number;
  totalEvents: number;
  topPages: Array<{ path: string; views: number }>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  topReferrers: Array<{ domain: string; count: number }>;
}

interface DailyView {
  date: string;
  views: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const response = await fetch(
        `/api/sites/${siteId}/analytics?start=${start.toISOString()}&end=${end.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setStats(data.stats);
      setDailyViews(data.dailyViews);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [siteId, dateRange]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-500">Track your site performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Page Views"
          value={stats?.totalPageViews || 0}
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          title="Unique Visitors"
          value={stats?.uniqueVisitors || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Sessions"
          value={stats?.uniqueSessions || 0}
          icon={<Globe className="w-5 h-5" />}
        />
        <StatCard
          title="Events"
          value={stats?.totalEvents || 0}
          icon={<MousePointer className="w-5 h-5" />}
        />
      </div>

      {/* Page Views Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Page Views Over Time</h2>
        <div className="h-64 flex items-end gap-1">
          {dailyViews.map((day, index) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{
                    height: `${Math.max((day.views / maxViews) * 100, 2)}%`,
                  }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {day.views} views
                </div>
              </div>
              {index % Math.ceil(dailyViews.length / 7) === 0 && (
                <span className="text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Top Pages</h2>
          <div className="space-y-3">
            {(stats?.topPages || []).slice(0, 5).map((page, index) => (
              <div key={page.path} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-400 w-4">
                    {index + 1}
                  </span>
                  <span className="text-sm truncate">{page.path}</span>
                </div>
                <span className="text-sm font-medium">{page.views}</span>
              </div>
            ))}
            {(!stats?.topPages || stats.topPages.length === 0) && (
              <p className="text-sm text-gray-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Devices</h2>
          <div className="space-y-3">
            {Object.entries(stats?.devices || {}).map(([device, count]) => {
              const total = Object.values(stats?.devices || {}).reduce(
                (a, b) => a + b,
                0
              );
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={device} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device)}
                      <span className="text-sm capitalize">{device}</span>
                    </div>
                    <span className="text-sm text-gray-500">{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.devices || Object.keys(stats.devices).length === 0) && (
              <p className="text-sm text-gray-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Traffic Sources</h2>
          <div className="space-y-3">
            {(stats?.topReferrers || []).slice(0, 5).map((referrer, index) => (
              <div
                key={referrer.domain}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-400 w-4">
                    {index + 1}
                  </span>
                  <span className="text-sm truncate">{referrer.domain}</span>
                </div>
                <span className="text-sm font-medium">{referrer.count}</span>
              </div>
            ))}
            {(!stats?.topReferrers || stats.topReferrers.length === 0) && (
              <p className="text-sm text-gray-500">No referrer data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Browsers */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Browsers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(stats?.browsers || {}).map(([browser, count]) => {
            const total = Object.values(stats?.browsers || {}).reduce(
              (a, b) => a + b,
              0
            );
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={browser}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <p className="font-semibold text-lg">{percentage}%</p>
                <p className="text-sm text-gray-600">{browser}</p>
                <p className="text-xs text-gray-400">{count} visits</p>
              </div>
            );
          })}
          {(!stats?.browsers || Object.keys(stats.browsers).length === 0) && (
            <p className="text-sm text-gray-500 col-span-full">No browser data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  change,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  change?: number;
}) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm">{title}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold">{value.toLocaleString()}</span>
        {change !== undefined && (
          <div
            className={`flex items-center text-sm ${
              change > 0
                ? 'text-green-600'
                : change < 0
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {change > 0 ? (
              <ArrowUp className="w-4 h-4" />
            ) : change < 0 ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
