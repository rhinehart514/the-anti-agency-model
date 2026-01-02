import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/email/send', () => ({
  sendFormNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/workflows/executor', () => ({
  triggerWorkflows: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limiter to always allow
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: vi.fn(() => ({ allowed: true })),
  rateLimiters: { forms: {} },
}));

const SITE_ID = 'site-123';
const FORM_ID = 'form-123';

// Mock form data
const mockForm = {
  id: FORM_ID,
  site_id: SITE_ID,
  name: 'Contact Form',
  status: 'active',
  settings: {
    successMessage: 'Thank you!',
    notifyEmails: ['admin@example.com'],
    redirectUrl: '/thank-you',
  },
  form_fields: [
    {
      id: 'field-1',
      slug: 'name',
      label: 'Name',
      type: 'text',
      validation: { required: true },
    },
    {
      id: 'field-2',
      slug: 'email',
      label: 'Email',
      type: 'email',
      validation: { required: true },
    },
    {
      id: 'field-3',
      slug: 'message',
      label: 'Message',
      type: 'textarea',
      validation: { required: false },
    },
  ],
};

const mockSubmission = {
  id: 'submission-123',
  form_id: FORM_ID,
  data: { name: 'John Doe', email: 'john@example.com', message: 'Hello' },
  status: 'new',
  created_at: new Date().toISOString(),
};

// Helper to create mock request
function createRequest(body: object): NextRequest {
  const url = `http://localhost:3000/api/sites/${SITE_ID}/forms/${FORM_ID}/submit`;
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'Test Agent',
    },
  });
}

describe('POST /api/sites/[siteId]/forms/[formId]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when data is missing', async () => {
    const request = createRequest({});
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Form data is required');
  });

  it('returns 400 when data is not an object', async () => {
    const request = createRequest({ data: 'invalid' });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Form data is required');
  });

  it('returns 404 when form does not exist', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({ data: { name: 'John' } });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: 'nonexistent' },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Form not found');
  });

  it('returns 404 when form lookup has error', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({ data: { name: 'John' } });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Form not found');
  });

  it('returns 400 when form is inactive', async () => {
    const inactiveForm = { ...mockForm, status: 'inactive' };

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: inactiveForm, error: null });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({ data: { name: 'John', email: 'john@example.com' } });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Form is not accepting submissions');
  });

  it('returns 400 when required fields are missing', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({ data: { name: 'John' } }); // missing email
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.errors).toHaveProperty('email');
    expect(data.errors.email).toBe('Email is required');
  });

  it('returns 400 when multiple required fields are missing', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({ data: { message: 'Hello' } }); // missing name and email
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.errors).toHaveProperty('name');
    expect(data.errors).toHaveProperty('email');
  });

  it('silently rejects honeypot spam', async () => {
    const formWithHoneypot = {
      ...mockForm,
      settings: { ...mockForm.settings, honeypotEnabled: true },
    };

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: formWithHoneypot, error: null });

    mockSupabase.from.mockReturnValue(formQuery);

    const request = createRequest({
      data: { name: 'John', email: 'john@example.com', _honeypot: 'spam value' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    // Returns success but doesn't actually save (no submission insert called)
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Verify form_submissions insert was never called
    expect(mockSupabase.from).not.toHaveBeenCalledWith('form_submissions');
  });

  it('submits form successfully with valid data', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com', message: 'Hello' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.submissionId).toBe('submission-123');
    expect(data.message).toBe('Thank you!');
    expect(data.redirectUrl).toBe('/thank-you');
  });

  it('removes honeypot field from saved data', async () => {
    let capturedSubmissionData: Record<string, unknown> | null = null;

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn((insertData: Record<string, unknown>) => {
      capturedSubmissionData = insertData;
      return submissionInsert;
    });
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        _honeypot: '', // Empty honeypot should be removed
      },
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(capturedSubmissionData).not.toBeNull();
    expect(capturedSubmissionData!.data).not.toHaveProperty('_honeypot');
    expect(capturedSubmissionData!.data).toHaveProperty('name', 'John Doe');
  });

  it('captures IP address and user agent', async () => {
    let capturedSubmissionData: Record<string, unknown> | null = null;

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn((insertData: Record<string, unknown>) => {
      capturedSubmissionData = insertData;
      return submissionInsert;
    });
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(capturedSubmissionData).not.toBeNull();
    expect(capturedSubmissionData!.ip_address).toBe('127.0.0.1');
    expect(capturedSubmissionData!.user_agent).toBe('Test Agent');
  });

  it('uses default success message when not configured', async () => {
    const formWithoutMessage = {
      ...mockForm,
      settings: { notifyEmails: [] },
    };

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: formWithoutMessage, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(data.message).toBe('Thank you for your submission!');
  });

  it('triggers workflows on successful submission', async () => {
    const { triggerWorkflows } = await import('@/lib/workflows/executor');

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(triggerWorkflows).toHaveBeenCalledWith(
      SITE_ID,
      'form_submit',
      expect.objectContaining({
        formId: FORM_ID,
        formName: 'Contact Form',
        submissionId: 'submission-123',
      })
    );
  });

  it('sends notification emails when configured', async () => {
    const { sendFormNotification } = await import('@/lib/email/send');

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(sendFormNotification).toHaveBeenCalledWith(
      ['admin@example.com'],
      expect.objectContaining({
        formName: 'Contact Form',
        submissionData: expect.objectContaining({ name: 'John Doe' }),
      })
    );
  });

  it('returns 500 when submission creation fails', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to submit form');
  });

  it('accepts optional fields without errors', async () => {
    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    // Submit without optional 'message' field
    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });

    expect(response.status).toBe(200);
  });

  it('includes site user ID in submission when provided', async () => {
    let capturedSubmissionData: Record<string, unknown> | null = null;

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn((insertData: Record<string, unknown>) => {
      capturedSubmissionData = insertData;
      return submissionInsert;
    });
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
      siteUserId: 'user-456',
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(capturedSubmissionData).not.toBeNull();
    expect(capturedSubmissionData!.site_user_id).toBe('user-456');
  });

  it('includes custom metadata in submission', async () => {
    let capturedSubmissionData: Record<string, unknown> | null = null;

    const formQuery: Record<string, unknown> = {};
    formQuery.select = vi.fn().mockReturnValue(formQuery);
    formQuery.eq = vi.fn().mockReturnValue(formQuery);
    formQuery.single = vi.fn().mockResolvedValue({ data: mockForm, error: null });

    const submissionInsert: Record<string, unknown> = {};
    submissionInsert.insert = vi.fn((insertData: Record<string, unknown>) => {
      capturedSubmissionData = insertData;
      return submissionInsert;
    });
    submissionInsert.select = vi.fn().mockReturnValue(submissionInsert);
    submissionInsert.single = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });

    mockSupabase.from
      .mockReturnValueOnce(formQuery)
      .mockReturnValueOnce(submissionInsert);

    const request = createRequest({
      data: { name: 'John Doe', email: 'john@example.com' },
      metadata: { source: 'landing-page', campaign: 'holiday-2025' },
    });
    await POST(request, { params: { siteId: SITE_ID, formId: FORM_ID } });

    expect(capturedSubmissionData).not.toBeNull();
    const metadata = capturedSubmissionData!.metadata as Record<string, unknown>;
    expect(metadata.source).toBe('landing-page');
    expect(metadata.campaign).toBe('holiday-2025');
    expect(metadata.submittedAt).toBeDefined();
  });
});

describe('Rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests when rate limited', async () => {
    // Re-mock rate limiter to reject
    const { withRateLimit } = await import('@/lib/rate-limit');
    vi.mocked(withRateLimit).mockReturnValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    });

    const request = createRequest({
      data: { name: 'John', email: 'john@example.com' },
    });
    const response = await POST(request, {
      params: { siteId: SITE_ID, formId: FORM_ID },
    });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });
});
