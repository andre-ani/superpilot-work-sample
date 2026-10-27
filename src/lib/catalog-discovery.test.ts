import {test} from 'node:test'
import assert from 'node:assert/strict'
import {discoverShopifyOrigin} from './catalog-discovery.ts'
test('headless discovery uses declared Shopify configuration, including escaped hydration data',()=>{
  assert.equal(discoverShopifyOrigin('Shopify.shop = "example.myshopify.com"'),'https://example.myshopify.com')
  assert.equal(discoverShopifyOrigin('{"PUBLIC_SHOPIFY_STORE_DOMAIN":"example.myshopify.com"}'),'https://example.myshopify.com')
  assert.equal(discoverShopifyOrigin(String.raw`{\"PUBLIC_SHOPIFY_STORE_DOMAIN\":\"example.myshopify.com\"}`),'https://example.myshopify.com')
  assert.equal(discoverShopifyOrigin('shopDomain:"example.myshopify.com"'),'https://example.myshopify.com')
})
test('does not follow arbitrary text, private hosts, lookalikes, or conflicting declarations',()=>{
  for (const html of ['visit arbitrary.myshopify.com', 'shopDomain:"127.0.0.1"', 'shopDomain:"evil.myshopify.com.attacker.com"', 'shopDomain:"a.myshopify.com"; Shopify.shop="b.myshopify.com"']) assert.equal(discoverShopifyOrigin(html),null)
})
