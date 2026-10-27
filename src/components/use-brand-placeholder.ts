import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const instruction = 'Enter your brand’s website'
const examples = ['drinkolipop.com', 'fromourplace.com', 'glossier.com']

export function useBrandPlaceholder(animate: boolean) {
  const reduced = useReducedMotion()
  const [text, setText] = useState(instruction)
  useEffect(() => {
    setText(instruction)
    if (!animate || reduced) return
    let timer: ReturnType<typeof setTimeout>
    let current = instruction, example = 0, showingExample = false
    const type = (target: string) => {
      if (current.length < target.length) {
        current = target.slice(0, current.length + 1); setText(current)
        timer = setTimeout(() => type(target), showingExample ? 65 : 32)
      } else timer = setTimeout(next, showingExample ? 1800 : 3600)
    }
    const erase = (target: string) => {
      if (current.length) { current = current.slice(0, -1); setText(current); timer = setTimeout(() => erase(target), 18) }
      else timer = setTimeout(() => type(target), 180)
    }
    const next = () => {
      showingExample = !showingExample
      const target = showingExample ? examples[example++ % examples.length] : instruction
      erase(target)
    }
    timer = setTimeout(next, 3600)
    return () => clearTimeout(timer)
  }, [animate, reduced])
  return animate && !reduced ? text : instruction
}
