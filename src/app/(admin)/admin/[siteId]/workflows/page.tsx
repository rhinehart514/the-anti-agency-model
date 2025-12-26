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
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Workflow,
  Settings,
  Play,
  Trash2,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  is_active: boolean;
  workflow_steps: any[];
  workflow_executions?: any[];
  created_at: string;
}

const triggerLabels: Record<string, string> = {
  form_submit: 'Form Submission',
  record_create: 'Record Created',
  record_update: 'Record Updated',
  record_delete: 'Record Deleted',
  user_signup: 'User Signup',
  user_login: 'User Login',
  order_placed: 'Order Placed',
  payment_received: 'Payment Received',
  schedule: 'Scheduled',
  webhook: 'Webhook',
  manual: 'Manual',
};

export default function WorkflowsPage({ params }: { params: { siteId: string } }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const response = await fetch(`/api/sites/${params.siteId}/workflows`);
        const data = await response.json();
        setWorkflows(data.workflows || []);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [params.siteId]);

  async function handleToggleActive(workflowId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/sites/${params.siteId}/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setWorkflows(workflows.map(w =>
          w.id === workflowId ? { ...w, is_active: isActive } : w
        ));
      }
    } catch (error) {
      console.error('Error updating workflow:', error);
    }
  }

  async function handleRunWorkflow(workflowId: string) {
    try {
      const response = await fetch(`/api/sites/${params.siteId}/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerData: {} }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Workflow executed successfully!');
      } else {
        alert('Workflow execution failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      alert('Failed to run workflow');
    }
  }

  async function handleDelete(workflowId: string) {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sites/${params.siteId}/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWorkflows(workflows.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Automate tasks with event-driven workflows</p>
        </div>
        <Button asChild>
          <Link href={`/admin/${params.siteId}/workflows/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading workflows...
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workflows yet
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Workflows let you automate tasks like sending emails, creating records,
              or updating data when events happen on your site.
            </p>
            <Button asChild>
              <Link href={`/admin/${params.siteId}/workflows/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => {
                  const lastExecution = workflow.workflow_executions?.[0];

                  return (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {workflow.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            {triggerLabels[workflow.trigger_type] || workflow.trigger_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {workflow.workflow_steps?.length || 0} steps
                      </TableCell>
                      <TableCell>
                        {lastExecution ? (
                          <div className="flex items-center gap-2">
                            {lastExecution.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : lastExecution.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-sm text-gray-500">
                              {new Date(lastExecution.started_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={workflow.is_active}
                            onCheckedChange={(checked) =>
                              handleToggleActive(workflow.id, checked)
                            }
                          />
                          <span className="text-sm">
                            {workflow.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRunWorkflow(workflow.id)}
                            disabled={!workflow.is_active}
                            title="Run workflow"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/${params.siteId}/workflows/${workflow.id}`}>
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
