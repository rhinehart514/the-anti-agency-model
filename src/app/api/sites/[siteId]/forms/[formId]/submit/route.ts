import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendFormNotification } from '@/lib/email/send';
import { triggerWorkflows } from '@/lib/workflows/executor';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit';
import { loggers } from '@/lib/logger';

// POST /api/sites/[siteId]/forms/[formId]/submit - Submit a form
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; formId: string } }
) {
  // Rate limit: 10 form submissions per minute
  const rateLimit = withRateLimit(request, rateLimiters.forms);
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  try {
    const body = await request.json();
    const { data, siteUserId, metadata } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Form data is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get form with fields
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (*)
      `)
      .eq('id', params.formId)
      .eq('site_id', params.siteId)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    if (form.status !== 'active') {
      return NextResponse.json(
        { error: 'Form is not accepting submissions' },
        { status: 400 }
      );
    }

    // Validate required fields
    const errors: Record<string, string> = {};
    for (const field of form.form_fields) {
      if (field.validation?.required && !data[field.slug]) {
        errors[field.slug] = `${field.label} is required`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Check honeypot if enabled
    if (form.settings?.honeypotEnabled && data._honeypot) {
      // Silently reject spam
      return NextResponse.json({
        success: true,
        message: form.settings.successMessage,
      });
    }

    // Clean data - remove honeypot field
    const cleanedData = { ...data };
    delete cleanedData._honeypot;

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: params.formId,
        site_user_id: siteUserId,
        data: cleanedData,
        metadata: {
          ...metadata,
          submittedAt: new Date().toISOString(),
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        status: 'new',
      })
      .select()
      .single();

    if (submissionError) {
      loggers.api.error({ error: submissionError }, 'Error creating submission');
      return NextResponse.json(
        { error: 'Failed to submit form' },
        { status: 500 }
      );
    }

    // Trigger form_submit workflows
    triggerWorkflows(params.siteId, 'form_submit', {
      formId: params.formId,
      formName: form.name,
      submissionId: submission.id,
      submissionData: cleanedData,
      siteUserId,
    }).catch((err) => loggers.api.error({ error: err }, 'Workflow trigger error'));

    // Send notification emails if configured
    if (form.settings?.notifyEmails?.length > 0) {
      sendFormNotification(form.settings.notifyEmails, {
        formName: form.name,
        submissionData: cleanedData,
        submittedAt: new Date().toISOString(),
        siteName: form.site_id, // Would ideally fetch site name
      }).catch((err) => loggers.api.error({ error: err }, 'Email notification error'));
    }

    // Save to collection if configured
    if (form.settings?.saveToCollection) {
      supabase
        .from('collection_records')
        .insert({
          collection_id: form.settings.saveToCollection,
          data: cleanedData,
          created_by: siteUserId || 'form_submission',
        })
        .then(({ error }) => {
          if (error) loggers.api.error({ error }, 'Collection save error');
        });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: form.settings?.successMessage || 'Thank you for your submission!',
      redirectUrl: form.settings?.redirectUrl,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Form submission error');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
