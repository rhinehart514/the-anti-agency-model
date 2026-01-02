/**
 * Tax calculation utilities using TaxJar
 * Provides simple interface for calculating taxes in checkout flow
 */

import { getTaxJarClient, TaxJarLineItem } from './client';

export interface Address {
  address1?: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  productTaxCode?: string;
  discount?: number;
}

export interface TaxCalculationResult {
  taxAmount: number;
  taxRate: number;
  taxableAmount: number;
  breakdown?: {
    stateTax: number;
    countyTax: number;
    cityTax: number;
    specialDistrictTax: number;
  };
  hasNexus: boolean;
  freightTaxable: boolean;
}

export interface NexusAddress {
  country: string;
  state: string;
  zip: string;
  city?: string;
  street?: string;
}

export interface SiteTaxSettings {
  enabled?: boolean;
  nexusAddresses?: NexusAddress[];
  defaultFromAddress?: NexusAddress;
  productTaxCodes?: Record<string, string>;
  exemptProducts?: string[];
}

export interface TaxCalculationParams {
  toAddress: Address;
  fromAddress?: Address;
  items: OrderItem[];
  shippingCost: number;
  discountAmount?: number;
  siteTaxSettings?: SiteTaxSettings; // Optional site-specific settings
}

/**
 * Calculate tax for an order using TaxJar
 * Falls back to 0 tax if TaxJar is not configured or fails
 */
export async function calculateOrderTax(
  params: TaxCalculationParams
): Promise<TaxCalculationResult> {
  const client = getTaxJarClient();

  // If TaxJar is not configured, return 0 tax
  if (!client.isAvailable()) {
    return {
      taxAmount: 0,
      taxRate: 0,
      taxableAmount: 0,
      hasNexus: false,
      freightTaxable: false,
    };
  }

  try {
    const siteTaxSettings = params.siteTaxSettings;

    // Filter out exempt products if site has exemption settings
    const taxableItems = siteTaxSettings?.exemptProducts?.length
      ? params.items.filter((item) => !siteTaxSettings.exemptProducts?.includes(item.id))
      : params.items;

    // Convert items to TaxJar format, applying site-specific tax codes
    const lineItems: TaxJarLineItem[] = taxableItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product_tax_code: item.productTaxCode || siteTaxSettings?.productTaxCodes?.[item.id],
      discount: item.discount,
    }));

    // Calculate total amount (for fallback)
    const subtotal = taxableItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Determine from address: explicit param > site default > generic US
    const fromAddr = params.fromAddress || siteTaxSettings?.defaultFromAddress;

    // Build nexus addresses from site settings
    const nexusAddresses = siteTaxSettings?.nexusAddresses?.map((addr) => ({
      country: addr.country,
      state: addr.state,
      zip: addr.zip,
      city: addr.city,
      street: addr.street,
    }));

    // Get zip from fromAddr - handle both Address (postalCode) and NexusAddress (zip) types
    const fromZip = fromAddr
      ? ('zip' in fromAddr ? fromAddr.zip : fromAddr.postalCode)
      : undefined;
    const fromStreet = fromAddr
      ? ('street' in fromAddr ? fromAddr.street : (fromAddr as Address).address1)
      : undefined;

    const taxRequest = {
      // From address (your nexus location - use site default or generic US)
      from_country: fromAddr?.country || 'US',
      from_zip: fromZip,
      from_state: fromAddr?.state,
      from_city: fromAddr?.city,
      from_street: fromStreet,

      // To address (customer shipping address)
      to_country: mapCountryToCode(params.toAddress.country),
      to_zip: params.toAddress.postalCode,
      to_state: params.toAddress.state,
      to_city: params.toAddress.city,
      to_street: params.toAddress.address1,

      // Order details
      amount: subtotal - (params.discountAmount || 0),
      shipping: params.shippingCost,
      line_items: lineItems.length > 0 ? lineItems : undefined,

      // Site-specific nexus addresses
      nexus_addresses: nexusAddresses?.length ? nexusAddresses : undefined,
    };

    const response = await client.calculateTax(taxRequest);

    const breakdown = response.tax.breakdown;

    return {
      taxAmount: response.tax.amount_to_collect,
      taxRate: response.tax.rate,
      taxableAmount: response.tax.taxable_amount,
      hasNexus: response.tax.has_nexus,
      freightTaxable: response.tax.freight_taxable,
      breakdown: breakdown
        ? {
            stateTax: breakdown.state_tax_collectable || 0,
            countyTax: breakdown.county_tax_collectable || 0,
            cityTax: breakdown.city_tax_collectable || 0,
            specialDistrictTax: breakdown.special_district_tax_collectable || 0,
          }
        : undefined,
    };
  } catch (error) {
    console.error('TaxJar calculation error:', error);
    // Return 0 tax on error - don't block checkout
    return {
      taxAmount: 0,
      taxRate: 0,
      taxableAmount: 0,
      hasNexus: false,
      freightTaxable: false,
    };
  }
}

/**
 * Get tax rate for a specific location (useful for display)
 */
export async function getTaxRateForLocation(
  postalCode: string,
  state?: string,
  city?: string,
  country: string = 'US'
): Promise<number> {
  const client = getTaxJarClient();

  if (!client.isAvailable()) {
    return 0;
  }

  try {
    const response = await client.getRateForLocation(postalCode, {
      state,
      city,
      country: mapCountryToCode(country),
    });

    return parseFloat(response.rate.combined_rate);
  } catch (error) {
    console.error('TaxJar rate lookup error:', error);
    return 0;
  }
}

/**
 * Map country name to ISO code if needed
 */
function mapCountryToCode(country: string): string {
  const countryMappings: Record<string, string> = {
    'United States': 'US',
    'United States of America': 'US',
    USA: 'US',
    Canada: 'CA',
    'United Kingdom': 'GB',
    UK: 'GB',
    Australia: 'AU',
  };

  // If already a 2-letter code, return as-is
  if (country.length === 2) {
    return country.toUpperCase();
  }

  return countryMappings[country] || country;
}

/**
 * Validate if an address is in a taxable jurisdiction
 * Useful for pre-checkout validation
 */
export async function validateTaxableAddress(address: Address): Promise<{
  isValid: boolean;
  taxRate?: number;
  error?: string;
}> {
  try {
    const rate = await getTaxRateForLocation(
      address.postalCode,
      address.state,
      address.city,
      address.country
    );

    return {
      isValid: true,
      taxRate: rate,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to validate address',
    };
  }
}
