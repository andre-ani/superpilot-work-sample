# Superpilot context knowledge base

This work sample creates Instagram image ads from a Shopify merchant's real product and brand context. The flow is Store → Brand → Product → Create. The merchant can collect any number of products, with a chosen variant or an explicit all-variants scope and exact reference images for each, or create a brand-only ad. There is no product-count or reference-photo cap. Brand extraction originals and merchant edits are separate. Generated output history is retained.

- Catalog source: public Shopify products.json. Price and availability can be unknown; never turn unknown into zero or sold out. Currency comes from cart.js when available.
- Brand context: confirmed name, original logo, palette, typography, useful value propositions, and merchant guidelines. Extracted tone/audience are interpretations. A favicon identifies the store in navigation; it is not an ad-ready logo.
- Ad intent: audience, message, offer, format, and creative direction come from the merchant, not from an unrelated site promotion.
- Image generation: GPT Image 2, via the existing durable generation workflow. Use actual product reference images. Generated text, printed packaging, and exact brand marks need human review. Do not promise perfect fidelity.
- Final output: PNG/JPEG pixels; Instagram's CTA button is separate. Square 1080×1080 and portrait 1080×1350 are feed formats; 1080×1920 is a story format.
- Speed: deterministic search first when sufficient; chunked OpenAI Decisions for reasoning-based classification; cached saved store data before re-extraction. Never silently switch the requested models.
- Scope: no checkout, ordering, Meta publication, customer accounts, or email sending. Provide advice and manipulate this demo's workspace only.
