'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Plus,
  Globe,
  Users,
  CreditCard,
  Settings,
  MoreHorizontal,
  ExternalLink,
  Edit2,
  Trash2,
  BarChart3,
  TrendingUp,
  Eye,
  Building2,
} from 'lucide-react';
import type {
  Organization,
  OrganizationMember,
  OrganizationBilling,
  Plan,
  PLAN_LIMITS,
} from '@/lib/organizations';

interface Site {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  isPublished: boolean;
  pageViews: number;
  updatedAt: Date;
}

interface OrgDashboardProps {
  organization: Organization;
  members: OrganizationMember[];
  billing: OrganizationBilling;
  sites: Site[];
  onCreateSite: () => void;
  onEditSite: (siteId: string) => void;
  onDeleteSite: (siteId: string) => void;
  onInviteMember: () => void;
  onRemoveMember: (memberId: string) => void;
  onUpgradePlan: () => void;
  onManageBilling: () => void;
}

export function OrgDashboard({
  organization,
  members,
  billing,
  sites,
  onCreateSite,
  onEditSite,
  onDeleteSite,
  onInviteMember,
  onRemoveMember,
  onUpgradePlan,
  onManageBilling,
}: OrgDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPageViews = sites.reduce((sum, site) => sum + site.pageViews, 0);

  const planLimits = {
    free: { sites: 1, members: 1 },
    starter: { sites: 3, members: 2 },
    pro: { sites: 10, members: 5 },
    agency: { sites: 50, members: 20 },
    enterprise: { sites: Infinity, members: Infinity },
  };

  const currentLimits = planLimits[billing.plan as keyof typeof planLimits];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-8 w-8 rounded"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: organization.primaryColor }}
                >
                  {organization.name[0]}
                </div>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{organization.name}</h1>
                <p className="text-xs text-gray-500">{organization.slug}.platform.io</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={billing.plan === 'free' ? 'secondary' : 'default'}>
                {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} Plan
              </Badge>
              <Button variant="outline" size="sm" onClick={onManageBilling}>
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sites</CardDescription>
              <CardTitle className="text-3xl flex items-baseline gap-2">
                {sites.length}
                <span className="text-sm font-normal text-gray-500">
                  / {currentLimits.sites === Infinity ? '∞' : currentLimits.sites}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-gray-500">
                <Globe className="h-4 w-4 mr-1" />
                {sites.filter((s) => s.isPublished).length} published
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Team Members</CardDescription>
              <CardTitle className="text-3xl flex items-baseline gap-2">
                {members.length}
                <span className="text-sm font-normal text-gray-500">
                  / {currentLimits.members === Infinity ? '∞' : currentLimits.members}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                {members.filter((m) => m.role === 'admin').length} admins
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Page Views (30d)</CardDescription>
              <CardTitle className="text-3xl">
                {totalPageViews.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                +12% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Plan</CardDescription>
              <CardTitle className="text-3xl capitalize">{billing.plan}</CardTitle>
            </CardHeader>
            <CardContent>
              {billing.plan !== 'enterprise' && (
                <Button size="sm" variant="outline" onClick={onUpgradePlan}>
                  Upgrade Plan
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="sites">
          <TabsList>
            <TabsTrigger value="sites" className="gap-2">
              <Globe className="h-4 w-4" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Sites Tab */}
          <TabsContent value="sites" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Sites</CardTitle>
                    <CardDescription>
                      Manage all sites in your organization
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search sites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      onClick={onCreateSite}
                      disabled={sites.length >= currentLimits.sites}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Site
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSites.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No sites yet</p>
                    <p className="text-sm mt-1">Create your first site to get started</p>
                    <Button className="mt-4" onClick={onCreateSite}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Site
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Page Views</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSites.map((site) => (
                        <TableRow key={site.id}>
                          <TableCell>
                            <div className="font-medium">{site.name}</div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://${site.customDomain || site.slug + '.platform.io'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {site.customDomain || `${site.slug}.platform.io`}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant={site.isPublished ? 'default' : 'secondary'}>
                              {site.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>{site.pageViews.toLocaleString()}</TableCell>
                          <TableCell className="text-gray-500">
                            {site.updatedAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditSite(site.id)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => onDeleteSite(site.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to your organization
                    </CardDescription>
                  </div>
                  <Button
                    onClick={onInviteMember}
                    disabled={members.length >= currentLimits.members}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium">User #{member.userId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={member.role === 'owner' ? 'default' : 'secondary'}
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {member.joinedAt?.toLocaleDateString() || 'Pending'}
                        </TableCell>
                        <TableCell>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => onRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>
                  View performance metrics across all your sites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Analytics charts coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default OrgDashboard;
