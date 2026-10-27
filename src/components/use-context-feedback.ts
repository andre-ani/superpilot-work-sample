import { useEffect, useRef } from 'react'
import { useAnimationControls, useReducedMotion } from 'motion/react'

/** Feedback changes paint only, keeping open popovers and their anchors stable. */
export function useContextFeedback(signature: string) {
  const controls = useAnimationControls()
  const previous = useRef<string | null>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    void controls.start(reduced ? { opacity: [.7, 1], transition: { duration: .15 } } : { opacity: [1, 1, 1], outlineWidth: [0, 3, 3, 0], outlineOffset: [0, 3, 3, 0], boxShadow: ['0 0 0 0 color-mix(in oklab, var(--primary) 0%, transparent)', '0 0 0 7px color-mix(in oklab, var(--primary) 22%, transparent)', '0 0 0 0 color-mix(in oklab, var(--primary) 0%, transparent)'], transition: { duration: .65, ease: 'easeInOut' } })
  }, [signature, controls, reduced])
  return controls
}
