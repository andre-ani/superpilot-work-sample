export const AD_COPY_POLICY_VERSION = 2
export const AD_LEGACY_SAFE_INSET = 8
export const AD_SAFE_INSET = 12
export const AD_SUBJECT_PADDING = 5
export const AD_QUIET_AREA_PERCENT = 40
export const AD_MIN_HEADLINE_SIZE = 84
export const AD_MIN_BODY_SIZE = 42
export const AD_BODY_LEADING = 1.1

export function safeAdBox(box: { x: number; y: number; width: number; height: number }, inset = AD_LEGACY_SAFE_INSET) {
  const x = Math.max(inset, box.x), y = Math.max(inset, box.y)
  return { x, y, width: Math.max(0, Math.min(100 - inset, box.x + box.width) - x), height: Math.max(0, Math.min(100 - inset, box.y + box.height) - y) }
}
