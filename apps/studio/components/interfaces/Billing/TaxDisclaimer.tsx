import { cn } from 'ui'

import { TAX_IDS } from '@/components/interfaces/Organization/BillingSettings/BillingCustomerData/TaxID.constants'
import { useOrganizationCustomerProfileQuery } from '@/data/organizations/organization-customer-profile-query'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'

// Countries where "VAT" is the correct term for consumption tax
const VAT_COUNTRY_CODES = new Set(
  TAX_IDS.filter((t) => t.type === 'eu_vat' || t.type.endsWith('_vat')).map((t) => t.countryIso2)
)

// Countries where "GST/HST" is the correct term (Canada)
const GST_HST_COUNTRY_CODES = new Set(
  TAX_IDS.filter((t) => t.type === 'ca_gst_hst').map((t) => t.countryIso2)
)

// Countries where "GST" is the correct term (Australia, New Zealand, Singapore, India)
const GST_COUNTRY_CODES = new Set(
  TAX_IDS.filter((t) => t.type.endsWith('_gst') && t.type !== 'ca_gst_hst').map(
    (t) => t.countryIso2
  )
)

function getTaxTerm(country: string | undefined): string {
  if (!country) return 'taxes'
  if (GST_HST_COUNTRY_CODES.has(country)) return 'GST/HST'
  if (GST_COUNTRY_CODES.has(country)) return 'GST'
  if (VAT_COUNTRY_CODES.has(country)) return 'VAT'
  return 'taxes'
}

interface TaxDisclaimerProps {
  className?: string
}

export const TaxDisclaimer = ({ className }: TaxDisclaimerProps) => {
  const { data: org } = useSelectedOrganizationQuery()
  const { data: customerProfile } = useOrganizationCustomerProfileQuery(
    { slug: org?.slug },
    { enabled: !!org?.slug, staleTime: 1000 * 60 * 30 }
  )

  const taxTerm = getTaxTerm(customerProfile?.address?.country)

  return (
    <p className={cn('text-xs text-foreground-muted', className)}>
      Prices shown do not include applicable {taxTerm}.
    </p>
  )
}
