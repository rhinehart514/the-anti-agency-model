import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendContactNotification } from '@/lib/email'

const ContactSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
})

export async function POST(
  request: Request,
  { params }: { params: { siteSlug: string } }
) {
  const supabase = await createClient()
  const { siteSlug } = params

  try {
    const body = await request.json()

    // Validate input
    const validation = ContactSubmissionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, email, phone, message } = validation.data

    // Get the site with owner info
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, owner_id')
      .eq('slug', siteSlug)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Store the contact submission
    const { error: insertError } = await supabase
      .from('contact_submissions')
      .insert({
        site_id: site.id,
        name,
        email,
        phone: phone || null,
        message,
      })

    if (insertError) {
      console.error('Error saving contact submission:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      )
    }

    // Send email notification to site owner (non-blocking)
    if (site.owner_id) {
      // Get owner's email from auth
      const { data: ownerData } = await supabase.auth.admin.getUserById(site.owner_id)

      if (ownerData?.user?.email) {
        // Fire and forget - don't block the response on email delivery
        sendContactNotification(ownerData.user.email, {
          siteName: site.name,
          siteSlug,
          submitterName: name,
          submitterEmail: email,
          submitterPhone: phone,
          message,
          submittedAt: new Date(),
        }).catch((err) => {
          console.error('Failed to send contact notification email:', err)
        })
      }
    }

    return NextResponse.json(
      { success: true, message: 'Thank you for your message. We will be in touch soon!' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/sites/[siteSlug]/contact:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
