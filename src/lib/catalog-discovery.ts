/** Use declared storefront configuration only; never follow arbitrary merchant instructions. */
export function discoverShopifyOrigin(html: string): string | null {
  const pattern = /\b(?:Shopify\.shop|PUBLIC_SHOPIFY_STORE_DOMAIN|shopDomain|shopifyDomain)\\*["']?\s*[:=]\s*\\*["'](?:https?:\/\/)?([a-z0-9][a-z0-9-]*\.myshopify\.com)(?=\/?\\*["'])/gi
  const domains = [...new Set([...html.matchAll(pattern)].map(match => match[1].toLowerCase()))]
  return domains.length === 1 ? `https://${domains[0]}` : null
}
