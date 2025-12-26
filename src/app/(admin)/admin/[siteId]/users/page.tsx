'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  Trash2,
  Eye,
} from 'lucide-react';

interface SiteUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  status: 'active' | 'suspended' | 'pending';
  site_user_roles: { site_roles: { name: string } }[];
  created_at: string;
  last_login_at?: string;
}

export default function UsersPage({ params }: { params: { siteId: string } }) {
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch(`/api/sites/${params.siteId}/users`);
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [params.siteId]);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage users who can access your site</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/${params.siteId}/users/roles`}>
              <Shield className="h-4 w-4 mr-2" />
              Manage Roles
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/${params.siteId}/users/invite`}>
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100">
                <Mail className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => !u.email_verified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'suspended').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Users</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Users will appear here when they sign up or are invited'}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href={`/admin/${params.siteId}/users/invite`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite User
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name || user.email}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.name || 'Unnamed'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[user.status]}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.site_user_roles?.length > 0 ? (
                          user.site_user_roles.map((role, i) => (
                            <Badge key={i} variant="outline">
                              {role.site_roles.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <Badge className="bg-green-100 text-green-700">Verified</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/${params.siteId}/users/${user.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
