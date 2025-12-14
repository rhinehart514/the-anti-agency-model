import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to upload images' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const siteSlug = formData.get('siteSlug') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const folder = siteSlug || 'general'
    const filename = `${folder}/${timestamp}-${randomId}.${ext}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('site-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)

      // If bucket doesn't exist, fall back to base64
      if (error.message.includes('not found') || error.message.includes('bucket')) {
        // Convert to base64 as fallback
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const dataUrl = `data:${file.type};base64,${base64}`
        return NextResponse.json({
          url: dataUrl,
          fallback: true,
          message: 'Using base64 fallback - Supabase storage bucket not configured'
        })
      }

      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('site-images')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/upload:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
