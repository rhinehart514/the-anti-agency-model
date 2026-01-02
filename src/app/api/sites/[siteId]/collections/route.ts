import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireSiteOwnership } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// GET /api/sites/[siteId]/collections - List all collections
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Require site ownership
    await requireSiteOwnership(supabase, params.siteId);

    const { data: collections, error } = await supabase
      .from('data_collections')
      .select(`
        *,
        collection_fields (*)
      `)
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: false });

    if (error) {
      loggers.api.error({ error }, 'Error fetching collections');
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collections });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    loggers.api.error({ error }, 'Collections error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/collections - Create a new collection
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Require site ownership
    await requireSiteOwnership(supabase, params.siteId);

    const body = await request.json();
    const { name, slug, description, icon, color, fields } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Create collection
    const { data: collection, error: collectionError } = await supabase
      .from('data_collections')
      .insert({
        site_id: params.siteId,
        name,
        slug,
        description,
        icon: icon || 'Database',
        color: color || '#3b82f6',
      })
      .select()
      .single();

    if (collectionError) {
      loggers.api.error({ error: collectionError }, 'Error creating collection');
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    // Create fields if provided
    if (fields && Array.isArray(fields) && fields.length > 0) {
      const fieldsToInsert = fields.map((field: any, index: number) => ({
        collection_id: collection.id,
        name: field.name,
        slug: field.slug,
        type: field.type,
        config: field.config || {},
        is_required: field.isRequired || false,
        is_unique: field.isUnique || false,
        is_primary: field.isPrimary || false,
        default_value: field.defaultValue,
        order_index: index,
      }));

      const { error: fieldsError } = await supabase
        .from('collection_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        loggers.api.error({ error: fieldsError }, 'Error creating fields');
        // Collection was created, but fields failed - continue
      }
    }

    // Fetch the complete collection with fields
    const { data: completeCollection } = await supabase
      .from('data_collections')
      .select(`
        *,
        collection_fields (*)
      `)
      .eq('id', collection.id)
      .single();

    return NextResponse.json({ collection: completeCollection }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    loggers.api.error({ error }, 'Create collection error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
