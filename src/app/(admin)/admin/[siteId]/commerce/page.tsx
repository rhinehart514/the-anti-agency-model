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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  Eye,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: 'draft' | 'active' | 'archived';
  images: string[];
  quantity: number;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  email: string;
  created_at: string;
}

interface CommerceStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
}

export default function CommercePage({ params }: { params: { siteId: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CommerceStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch(`/api/sites/${params.siteId}/products`),
          fetch(`/api/sites/${params.siteId}/orders`),
        ]);

        const productsData = await productsRes.json();
        const ordersData = await ordersRes.json();

        setProducts(productsData.products || []);
        setOrders(ordersData.orders || []);

        // Calculate stats
        const totalRevenue = (ordersData.orders || []).reduce(
          (sum: number, order: Order) => sum + (order.total || 0),
          0
        );

        const uniqueEmails = new Set((ordersData.orders || []).map((o: Order) => o.email));

        setStats({
          totalProducts: productsData.pagination?.total || productsData.products?.length || 0,
          totalOrders: ordersData.pagination?.total || ordersData.orders?.length || 0,
          totalRevenue,
          totalCustomers: uniqueEmails.size,
        });
      } catch (error) {
        console.error('Error fetching commerce data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.siteId]);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700',
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commerce</h1>
          <p className="text-gray-600">Manage products and orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/${params.siteId}/commerce/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/${params.siteId}/commerce/products/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
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
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Button size="sm" asChild>
                <Link href={`/admin/${params.siteId}/commerce/products/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
                  <p className="text-gray-600 mb-4">Add your first product to start selling</p>
                  <Button asChild>
                    <Link href={`/admin/${params.siteId}/commerce/products/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[product.status]}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/${params.siteId}/commerce/products/${product.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
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
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-600">Orders will appear here when customers make purchases</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{order.email}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.payment_status] || 'bg-gray-100'}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/${params.siteId}/commerce/orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
