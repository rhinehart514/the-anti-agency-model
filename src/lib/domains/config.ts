export interface DomainVerification {
  domain: string
  verified: boolean
  txtRecord: string
  cnameRecord: string
}

export function generateVerificationCode(siteId: string): string {
  // Generate a deterministic verification code based on site ID
  return `anti-agency-verify=${siteId.slice(0, 8)}`
}

export function getDnsInstructions(domain: string, siteSlug: string): {
  cname: { name: string; value: string }
  txt: { name: string; value: string }
} {
  const baseHost = process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host
    : 'app.antiagency.com'

  return {
    cname: {
      name: domain,
      value: baseHost,
    },
    txt: {
      name: `_antiagency.${domain}`,
      value: generateVerificationCode(siteSlug),
    },
  }
}

export async function verifyDomain(domain: string, expectedTxtValue: string): Promise<boolean> {
  try {
    // In production, you'd use DNS lookup
    // For now, we'll use a simple fetch to a DNS-over-HTTPS API
    const response = await fetch(
      `https://dns.google/resolve?name=_antiagency.${domain}&type=TXT`
    )

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const txtRecords = data.Answer || []

    return txtRecords.some(
      (record: { data: string }) =>
        record.data?.replace(/"/g, '') === expectedTxtValue
    )
  } catch (error) {
    console.error('Domain verification error:', error)
    return false
  }
}
