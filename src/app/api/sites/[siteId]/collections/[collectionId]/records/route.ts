import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sites/[siteId]/collections/[collectionId]/records
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; collectionId: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortField = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') === 'asc' ? true : false;

    // Verify collection belongs to site
    const { data: collection, error: collectionError } = await supabase
      .from('data_collections')
      .select('id')
      .eq('id', params.collectionId)
      .eq('site_id', params.siteId)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Fetch records
    let query = supabase
      .from('collection_records')
      .select('*', { count: 'exact' })
      .eq('collection_id', params.collectionId)
      .range(offset, offset + limit - 1);

    // Apply sorting
    if (sortField === 'created_at' || sortField === 'updated_at') {
      query = query.order(sortField, { ascending: sortOrder });
    } else {
      // Sort by JSONB field
      query = query.order('created_at', { ascending: false });
    }

    const { data: records, count, error } = await query;

    if (error) {
      console.error('Error fetching records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Records error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sites/[siteId]/collections/[collectionId]/records
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; collectionId: string } }
) {
  try {
    const body = await request.json();
    const { data, createdBy } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Data object is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify collection belongs to site
    const { data: collection, error: collectionError } = await supabase
      .from('data_collections')
      .select('id')
      .eq('id', params.collectionId)
      .eq('site_id', params.siteId)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Create record
    const { data: record, error } = await supabase
      .from('collection_records')
      .insert({
        collection_id: params.collectionId,
        data,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating record:', error);
      return NextResponse.json(
        { error: 'Failed to create record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Create record error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// PATCH /api/sites/[siteId]/collections/[collectionId]/records (bulk update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string; collectionId: string } }
) {
  try {
    const body = await request.json();
    const { recordIds, updates, updatedBy } = body;

    if (!recordIds || !Array.isArray(recordIds) || !updates) {
      return NextResponse.json(
        { error: 'Record IDs and updates are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update each record
    const results = await Promise.all(
      recordIds.map(async (recordId: string) => {
        const { data, error } = await supabase
          .from('collection_records')
          .update({
            data: updates,
            updated_by: updatedBy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId)
          .eq('collection_id', params.collectionId)
          .select()
          .single();

        return { recordId, success: !error, data, error };
      })
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      updated: successful.length,
      failed: failed.length,
      records: successful.map((r) => r.data),
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE /api/sites/[siteId]/collections/[collectionId]/records (bulk delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; collectionId: string } }
) {
  try {
    const body = await request.json();
    const { recordIds } = body;

    if (!recordIds || !Array.isArray(recordIds)) {
      return NextResponse.json(
        { error: 'Record IDs are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('collection_records')
      .delete()
      .in('id', recordIds)
      .eq('collection_id', params.collectionId);

    if (error) {
      console.error('Error deleting records:', error);
      return NextResponse.json(
        { error: 'Failed to delete records' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: recordIds.length });
  } catch (error) {
    console.error('Delete records error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
