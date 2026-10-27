export const AD_SAFE_INSET = 8
export const AD_MIN_HEADLINE_SIZE = 84
export const AD_MIN_BODY_SIZE = 42
export const AD_BODY_LEADING = 1.1

export function safeAdBox(box: { x: number; y: number; width: number; height: number }) {
  const x = Math.max(AD_SAFE_INSET, box.x), y = Math.max(AD_SAFE_INSET, box.y)
  return { x, y, width: Math.max(0, Math.min(100 - AD_SAFE_INSET, box.x + box.width) - x), height: Math.max(0, Math.min(100 - AD_SAFE_INSET, box.y + box.height) - y) }
}
