import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/templates/[templateId] - Get template details
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', params.templateId)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check visibility
    if (template.visibility !== 'public') {
      // For private templates, check ownership
      // This would require auth check
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[templateId] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const body = await request.json();
    const { name, description, category, visibility, thumbnail, price, status } = body;

    const supabase = await createClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;

    const { data: template, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', params.templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/templates/[templateId] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', params.templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
