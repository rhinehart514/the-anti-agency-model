import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'site-images';
    const folder = formData.get('folder') as string | null;
    const siteId = formData.get('siteId') as string | null;
    const siteSlug = formData.get('siteSlug') as string | null;

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

    const supabase = await createClient();

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
      console.error('Storage upload error:', error);

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
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/upload - Delete a file
export async function DELETE(request: NextRequest) {
  try {
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

    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
