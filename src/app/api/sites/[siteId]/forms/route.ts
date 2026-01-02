import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';

// GET /api/sites/[siteId]/forms - List all forms
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (*),
        form_submissions (id)
      `)
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: false });

    if (error) {
      loggers.api.error({ error }, 'Error fetching forms');
      return NextResponse.json(
        { error: 'Failed to fetch forms' },
        { status: 500 }
      );
    }

    // Add submission count
    const formsWithStats = forms.map((form) => ({
      ...form,
      submissionCount: form.form_submissions?.length || 0,
      form_submissions: undefined,
    }));

    return NextResponse.json({ forms: formsWithStats });
  } catch (error) {
    loggers.api.error({ error }, 'Forms error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/forms - Create a new form
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const body = await request.json();
    const { name, slug, description, settings, fields } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        site_id: params.siteId,
        name,
        slug,
        description,
        settings: settings || {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
        },
        status: 'draft',
      })
      .select()
      .single();

    if (formError) {
      loggers.api.error({ error: formError }, 'Error creating form');
      return NextResponse.json(
        { error: 'Failed to create form' },
        { status: 500 }
      );
    }

    // Create fields if provided
    if (fields && Array.isArray(fields) && fields.length > 0) {
      const fieldsToInsert = fields.map((field: any, index: number) => ({
        form_id: form.id,
        name: field.name,
        slug: field.slug,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        help_text: field.helpText,
        config: field.config || {},
        validation: field.validation || {},
        conditional_logic: field.conditionalLogic,
        order_index: index,
      }));

      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        loggers.api.error({ error: fieldsError }, 'Error creating fields');
      }
    }

    // Fetch complete form
    const { data: completeForm } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (*)
      `)
      .eq('id', form.id)
      .single();

    return NextResponse.json({ form: completeForm }, { status: 201 });
  } catch (error) {
    loggers.api.error({ error }, 'Create form error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
