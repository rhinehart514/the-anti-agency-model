'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Upload,
  X,
  FileIcon,
  ImageIcon,
  FileTextIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

interface FileUploadProps {
  bucket: 'site-assets' | 'form-attachments' | 'user-avatars';
  folder?: string;
  siteId?: string;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
  disabled?: boolean;
}

function FilePreview({ file, onRemove, disabled }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');

  return (
    <div className="relative group flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-shrink-0">
        {isImage ? (
          <img
            src={file.url}
            alt={file.name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : file.type.includes('pdf') ? (
          <FileTextIcon className="w-12 h-12 text-red-500" />
        ) : (
          <FileIcon className="w-12 h-12 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

export function FileUpload({
  bucket,
  folder,
  siteId,
  accept,
  maxSize,
  multiple = false,
  value = [],
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  className,
  disabled = false,
  placeholder = 'Drag and drop or click to upload',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || uploading) return;

      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Validate max files
      if (!multiple && fileArray.length > 1) {
        setError('Only one file can be uploaded');
        return;
      }

      // Validate file sizes
      if (maxSize) {
        const oversized = fileArray.find((f) => f.size > maxSize);
        if (oversized) {
          setError(`File "${oversized.name}" exceeds maximum size`);
          onUploadError?.(`File "${oversized.name}" exceeds maximum size`);
          return;
        }
      }

      setError(null);
      setUploading(true);
      onUploadStart?.();

      const uploadedFiles: UploadedFile[] = [...value];

      for (const file of fileArray) {
        try {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', bucket);
          if (folder) formData.append('folder', folder);
          if (siteId) formData.append('siteId', siteId);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const result = await response.json();

          const uploadedFile: UploadedFile = {
            id: result.path,
            name: file.name,
            url: result.url,
            path: result.path,
            size: file.size,
            type: file.type,
          };

          if (multiple) {
            uploadedFiles.push(uploadedFile);
          } else {
            uploadedFiles[0] = uploadedFile;
          }

          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
          onUploadComplete?.(uploadedFile);
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(err.message || 'Upload failed');
          onUploadError?.(err.message || 'Upload failed');
        }
      }

      setUploading(false);
      setUploadProgress({});
      onChange?.(uploadedFiles);
    },
    [
      bucket,
      folder,
      siteId,
      maxSize,
      multiple,
      value,
      disabled,
      uploading,
      onChange,
      onUploadStart,
      onUploadComplete,
      onUploadError,
    ]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [disabled, handleUpload]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleUpload(e.target.files);
      }
      // Reset input to allow re-uploading same file
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleRemove = useCallback(
    async (fileToRemove: UploadedFile) => {
      try {
        // Delete from storage
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket,
            path: fileToRemove.path,
          }),
        });

        // Update state
        const newFiles = value.filter((f) => f.id !== fileToRemove.id);
        onChange?.(newFiles);
      } catch (err) {
        console.error('Delete error:', err);
      }
    },
    [bucket, value, onChange]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-300 bg-red-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-600">{placeholder}</p>
              {accept && (
                <p className="text-xs text-gray-400">
                  Accepts: {accept.replace(/,/g, ', ')}
                </p>
              )}
              {maxSize && (
                <p className="text-xs text-gray-400">
                  Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Upload progress */}
      {Object.entries(uploadProgress).map(([name, progress]) => (
        <div key={name} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 truncate">{name}</p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Uploaded files */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onRemove={() => handleRemove(file)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Simple image upload component for inline use
interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  bucket?: 'site-assets' | 'form-attachments' | 'user-avatars';
  folder?: string;
  siteId?: string;
  className?: string;
  placeholder?: string;
  aspectRatio?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'site-assets',
  folder,
  siteId,
  className,
  placeholder = 'Upload image',
  aspectRatio = '16/9',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only images are allowed');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (folder) formData.append('folder', folder);
      if (siteId) formData.append('siteId', siteId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onChange(result.url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        className="hidden"
      />

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-colors',
          'border-gray-300 hover:border-gray-400',
          uploading && 'opacity-50 cursor-wait'
        )}
        style={{ aspectRatio }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-500 text-center">{placeholder}</p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
