import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit';
import { requireAuth, requireSiteOwnership } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// Allowed buckets and their configurations
const BUCKET_CONFIG: Record<string, { maxSize: number; allowedTypes: string[] }> = {
  'site-images': {
    maxSize: 5 * 1024 * 1024, // 5MB (legacy bucket)
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
  'site-assets': {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
  'form-attachments': {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
  },
  'user-avatars': {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
};

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter than middleware default)
    const rateLimit = withRateLimit(request, rateLimiters.uploads);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const supabase = await createClient();

    // Require authentication
    const auth = await requireAuth(supabase);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'site-images';
    const folder = formData.get('folder') as string | null;
    const siteId = formData.get('siteId') as string | null;
    const siteSlug = formData.get('siteSlug') as string | null;

    // If siteId is provided, verify the user owns the site
    if (siteId) {
      await requireSiteOwnership(supabase, siteId);
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!BUCKET_CONFIG[bucket]) {
      return NextResponse.json(
        { error: 'Invalid bucket specified' },
        { status: 400 }
      );
    }

    const config = BUCKET_CONFIG[bucket];

    // Validate file size
    if (file.size > config.maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${config.maxSize / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!config.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const extension = file.name.split('.').pop() || '';
    const uniqueId = nanoid(10);
    let filePath = `${uniqueId}.${extension}`;

    // Add folder prefix if provided
    if (folder) {
      filePath = `${folder}/${filePath}`;
    } else if (siteSlug) {
      // Legacy support for siteSlug
      filePath = `${siteSlug}/${filePath}`;
    }

    // Add site ID prefix for site-specific assets
    if (siteId && bucket === 'site-assets') {
      filePath = `${siteId}/${filePath}`;
    }

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 year cache
      upsert: false,
    });

    if (error) {
      loggers.api.error({ error, bucket, filePath }, 'Storage upload error');

      // If bucket doesn't exist, fall back to base64
      if (error.message.includes('not found') || error.message.includes('bucket')) {
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        return NextResponse.json({
          url: dataUrl,
          fallback: true,
          message: 'Using base64 fallback - Supabase storage bucket not configured'
        });
      }

      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      path: data.path,
      url: publicUrlData.publicUrl,
      fileName: file.name,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    // Handle auth errors from requireAuth/requireSiteOwnership
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    loggers.api.error({ error }, 'Upload error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/upload - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authentication
    await requireAuth(supabase);

    const { bucket, path } = await request.json();

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Bucket and path are required' },
        { status: 400 }
      );
    }

    if (!BUCKET_CONFIG[bucket]) {
      return NextResponse.json(
        { error: 'Invalid bucket specified' },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      loggers.api.error({ error, bucket, path }, 'Storage delete error');
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    loggers.api.error({ error }, 'Delete error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
