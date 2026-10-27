import { motion, useReducedMotion } from 'motion/react'
import styles from './superpilot-reference.module.css'

export function HomeIntro({ onReady }: { onReady?: () => void } = {}) {
  const reduced = useReducedMotion()
  const line = (index: number) => ({ initial: { opacity: 0, y: reduced ? 0 : 10, filter: reduced ? 'none' : 'blur(10px)' }, animate: { opacity: 1, y: 0, filter: reduced ? 'none' : 'blur(0px)' }, exit: { opacity: 0, y: reduced ? 0 : 10, filter: reduced ? 'none' : 'blur(10px)' }, transition: { duration: reduced ? 0 : .5, delay: reduced ? 0 : index * .25, ease: [.25, .1, .25, 1] as const } })
  return <h1 className={styles.headline}>
    <motion.span className={styles.line} {...line(0)}>Make <span className={styles.brand}><img src="/brand/instagram.svg" alt="" /><span className={styles.underlined}>Instagram ads<img src="/brand/superpilot-underline.svg" alt="" /></span></span></motion.span>
    <motion.span className={styles.line} {...line(1)} onAnimationComplete={onReady}>from your <span className={styles.brand}><img src="/brand/shopify.svg" alt="" />Shopify store.</span></motion.span>
  </h1>
}
