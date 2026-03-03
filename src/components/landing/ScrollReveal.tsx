import { motion, useReducedMotion, type Variant } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade'

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
  up: { opacity: 0, y: 32 },
  down: { opacity: 0, y: -32 },
  left: { opacity: 0, x: -48 },
  right: { opacity: 0, x: 48 },
  fade: { opacity: 0 },
}

const visibleVariant: Variant = { opacity: 1, x: 0, y: 0 }

// Expo ease-out: snappy deceleration, no bounce
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.7,
  threshold = 0.15,
  once = true,
  className,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={{
        hidden: hiddenVariants[direction],
        visible: {
          ...visibleVariant,
          transition: { duration, delay, ease: EXPO_OUT },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
