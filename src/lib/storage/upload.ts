import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export type BucketName = 'site-assets' | 'form-attachments' | 'user-avatars';

export interface UploadOptions {
  bucket: BucketName;
  folder?: string;
  fileName?: string;
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

// Generate a unique file path
function generateFilePath(
  originalName: string,
  folder?: string
): string {
  const extension = originalName.split('.').pop() || '';
  const uniqueId = nanoid(10);
  const safeName = `${uniqueId}.${extension}`;

  if (folder) {
    return `${folder}/${safeName}`;
  }
  return safeName;
}

// Get the content type from file extension
function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    tar: 'application/x-tar',
  };

  return contentTypes[extension || ''] || 'application/octet-stream';
}

// Upload a file to Supabase Storage
export async function uploadFile(
  file: File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const supabase = await createClient();

    const fileName = options.fileName || (file instanceof File ? file.name : 'file');
    const filePath = generateFilePath(fileName, options.folder);
    const contentType = options.contentType || getContentType(fileName);

    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        contentType,
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

// Upload from base64 string
export async function uploadBase64(
  base64Data: string,
  options: UploadOptions & { fileName: string }
): Promise<UploadResult> {
  try {
    // Extract the base64 content (remove data:image/png;base64, prefix if present)
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Convert base64 to Blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: options.contentType || getContentType(options.fileName),
    });

    return uploadFile(blob, options);
  } catch (error: any) {
    console.error('Base64 upload error:', error);
    return { success: false, error: error.message };
  }
}

// Upload from URL
export async function uploadFromUrl(
  url: string,
  options: UploadOptions & { fileName: string }
): Promise<UploadResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const blob = await response.blob();
    return uploadFile(blob, {
      ...options,
      contentType: options.contentType || response.headers.get('content-type') || undefined,
    });
  } catch (error: any) {
    console.error('URL upload error:', error);
    return { success: false, error: error.message };
  }
}

// Delete a file
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
}

// Delete multiple files
export async function deleteFiles(
  bucket: BucketName,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
}

// List files in a folder
export async function listFiles(
  bucket: BucketName,
  folder?: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  files?: Array<{
    name: string;
    id: string;
    size: number;
    createdAt: string;
    publicUrl: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error('List error:', error);
      return { success: false, error: error.message };
    }

    const files = data
      .filter((item) => item.id) // Filter out folders
      .map((item) => {
        const path = folder ? `${folder}/${item.name}` : item.name;
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        return {
          name: item.name,
          id: item.id!,
          size: item.metadata?.size || 0,
          createdAt: item.created_at || '',
          publicUrl: publicUrlData.publicUrl,
        };
      });

    return { success: true, files };
  } catch (error: any) {
    console.error('List error:', error);
    return { success: false, error: error.message };
  }
}

// Get a signed URL for private files
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (error: any) {
    console.error('Signed URL error:', error);
    return { success: false, error: error.message };
  }
}
