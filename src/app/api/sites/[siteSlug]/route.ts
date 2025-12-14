import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { siteSlug: string } }
) {
  const supabase = createClient()

  const result = await supabase
    .from('sites')
    .select('*')
    .eq('slug', params.siteSlug)
    .single()

  if (result.error || !result.data) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return NextResponse.json(result.data)
}
