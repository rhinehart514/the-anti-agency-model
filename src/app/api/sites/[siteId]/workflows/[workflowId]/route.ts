import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeWorkflow } from '@/lib/workflows/executor';
import { loggers } from '@/lib/logger';

// GET /api/sites/[siteId]/workflows/[workflowId] - Get workflow details
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; workflowId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (*),
        workflow_executions (
          id,
          status,
          trigger_type,
          started_at,
          completed_at
        )
      `)
      .eq('id', params.workflowId)
      .eq('site_id', params.siteId)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Sort steps by order
    workflow.workflow_steps = workflow.workflow_steps.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    // Limit executions to last 10
    workflow.workflow_executions = (workflow.workflow_executions || [])
      .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10);

    return NextResponse.json({ workflow });
  } catch (error) {
    loggers.api.error({ error }, 'Workflow error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/sites/[siteId]/workflows/[workflowId] - Update workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string; workflowId: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      isActive,
      steps,
    } = body;

    const supabase = await createClient();

    // Update workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .update({
        name,
        description,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.workflowId)
      .eq('site_id', params.siteId)
      .select()
      .single();

    if (workflowError) {
      loggers.api.error({ error: workflowError }, 'Error updating workflow');
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_id', params.workflowId);

      // Insert new steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map((step: any, index: number) => ({
          workflow_id: params.workflowId,
          name: step.name,
          action_type: step.actionType,
          config: step.config || {},
          order_index: index,
        }));

        await supabase.from('workflow_steps').insert(stepsToInsert);
      }
    }

    // Fetch complete workflow
    const { data: completeWorkflow } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (*)
      `)
      .eq('id', params.workflowId)
      .single();

    return NextResponse.json({ workflow: completeWorkflow });
  } catch (error) {
    loggers.api.error({ error }, 'Update workflow error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/sites/[siteId]/workflows/[workflowId] - Delete workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; workflowId: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', params.workflowId)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting workflow');
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    loggers.api.error({ error }, 'Delete workflow error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/workflows/[workflowId] - Execute workflow manually
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; workflowId: string } }
) {
  try {
    const body = await request.json();
    const { triggerData = {} } = body;

    const result = await executeWorkflow(params.workflowId, 'manual', triggerData);

    return NextResponse.json({
      success: result.success,
      executionId: result.executionId,
      message: result.success ? 'Workflow executed successfully' : 'Workflow execution failed',
    });
  } catch (error: any) {
    loggers.api.error({ error }, 'Execute workflow error');
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
