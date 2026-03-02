import { useRef } from 'react'
import { motion, useReducedMotion, type Variant } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale'

interface ScrollRevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  threshold?: number
  once?: boolean
  className?: string
}

const hiddenVariants: Record<Direction, Variant> = {
  up: { opacity: 0, y: 40 },
  down: { opacity: 0, y: -40 },
  left: { opacity: 0, x: -60 },
  right: { opacity: 0, x: 60 },
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.85 },
}

const visibleVariant: Variant = { opacity: 1, x: 0, y: 0, scale: 1 }

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  threshold = 0.2,
  once = true,
  className,
}: ScrollRevealProps) {
  const ref = useRef(null)
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={{
        hidden: hiddenVariants[direction],
        visible: {
          ...visibleVariant,
          transition: {
            duration,
            delay,
            ease: [0.25, 0.4, 0.25, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
