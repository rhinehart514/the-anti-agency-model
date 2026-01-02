import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  handleApiError,
  fromZodError,
} from '@/lib/api-errors';

// Zod schemas for validation
const NexusAddressSchema = z.object({
  country: z.string().min(2).max(2).default('US'),
  state: z.string().min(2).max(2),
  zip: z.string().min(5),
  city: z.string().optional(),
  street: z.string().optional(),
});

const TaxSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  nexusAddresses: z.array(NexusAddressSchema).default([]),
  defaultFromAddress: NexusAddressSchema.optional(),
  productTaxCodes: z.record(z.string()).optional(), // productId -> tax code mapping
  exemptProducts: z.array(z.string()).optional(), // product IDs that are tax exempt
});

export type NexusAddress = z.infer<typeof NexusAddressSchema>;
export type TaxSettings = z.infer<typeof TaxSettingsSchema>;

/**
 * GET /api/sites/[siteId]/tax-settings
 * Get tax settings for a site
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new UnauthorizedError();
    }

    // Get site with settings
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, owner_id, settings')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      throw new NotFoundError('Site');
    }

    // Verify ownership
    if (site.owner_id !== user.id) {
      throw new UnauthorizedError('You do not own this site');
    }

    // Extract tax settings from site settings
    const settings = (site.settings as Record<string, unknown>) || {};
    const taxSettings = settings.tax as TaxSettings | undefined;

    // Return tax settings or defaults
    return NextResponse.json({
      data: taxSettings || {
        enabled: false,
        nexusAddresses: [],
        defaultFromAddress: undefined,
        productTaxCodes: {},
        exemptProducts: [],
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

/**
 * PATCH /api/sites/[siteId]/tax-settings
 * Update tax settings for a site
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new UnauthorizedError();
    }

    // Get site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, owner_id, settings')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      throw new NotFoundError('Site');
    }

    // Verify ownership
    if (site.owner_id !== user.id) {
      throw new UnauthorizedError('You do not own this site');
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = TaxSettingsSchema.partial().safeParse(body);

    if (!parseResult.success) {
      throw fromZodError(parseResult.error);
    }

    const updates = parseResult.data;

    // Merge with existing settings
    const existingSettings = (site.settings as Record<string, unknown>) || {};
    const existingTaxSettings = (existingSettings.tax as TaxSettings) || {
      enabled: false,
      nexusAddresses: [],
    };

    const newTaxSettings: TaxSettings = {
      ...existingTaxSettings,
      ...updates,
    };

    // Update site settings
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        settings: {
          ...existingSettings,
          tax: newTaxSettings,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    if (updateError) {
      throw new Error(`Failed to update tax settings: ${updateError.message}`);
    }

    return NextResponse.json({
      data: newTaxSettings,
      message: 'Tax settings updated successfully',
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
