import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sites/[siteId]/workflows - List all workflows
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: workflows, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (*)
      `)
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Workflows error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/workflows - Create a new workflow
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
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

    if (!name || !triggerType) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        site_id: params.siteId,
        name,
        description,
        trigger_type: triggerType,
        trigger_config: triggerConfig || {},
        is_active: isActive ?? false,
      })
      .select()
      .single();

    if (workflowError) {
      console.error('Error creating workflow:', workflowError);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    // Create steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        workflow_id: workflow.id,
        name: step.name,
        action_type: step.actionType,
        config: step.config || {},
        order_index: index,
      }));

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepsToInsert);

      if (stepsError) {
        console.error('Error creating steps:', stepsError);
      }
    }

    // Fetch complete workflow
    const { data: completeWorkflow } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (*)
      `)
      .eq('id', workflow.id)
      .single();

    return NextResponse.json({ workflow: completeWorkflow }, { status: 201 });
  } catch (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
