import '@fontsource-variable/fraunces'
import '@fontsource-variable/space-grotesk'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { ScrollReveal } from '@/components/landing/ScrollReveal'
import { MediaSlot } from '@/components/landing/MediaSlot'

/* ─── Data ─── */

const stages = [
  { num: '01', name: 'Story Seed', desc: 'Transform narrative fragments into a structured core. Expand, condense, or upload.', phase: 'A' as const },
  { num: '02', name: 'Treatment', desc: 'AI builds a structured dramatic treatment. Tone, pacing, thematic anchors.', phase: 'A' as const },
  { num: '03', name: 'Beat Sheet', desc: 'Break the treatment into dramatic beats with scene boundaries.', phase: 'A' as const },
  { num: '04', name: 'Screenplay', desc: 'Full screenplay with professional formatting and dialogue.', phase: 'A' as const },
  { num: '05', name: 'Asset Bible', desc: 'Lock characters, locations, props, and style capsules for consistency.', phase: 'A' as const },
  { num: '06', name: 'Script Hub', desc: 'Scene-by-scene breakdown. Navigate your production.', phase: 'B' as const },
  { num: '07', name: 'Shot Design', desc: 'Camera angles, composition, movement, and pacing per shot.', phase: 'B' as const },
  { num: '08', name: 'Visual Prompts', desc: 'AI-crafted generation prompts with continuity awareness.', phase: 'B' as const },
  { num: '09', name: 'Dialogue Polish', desc: 'Refine dialogue timing and character voice consistency.', phase: 'B' as const },
  { num: '10', name: 'Frame Anchors', desc: 'Cheap reference frames before committing credits.', phase: 'B' as const },
  { num: '11', name: 'Cost Checkout', desc: 'Review costs, choose speed vs quality, gate before render.', phase: 'B' as const },
  { num: '12', name: 'Render', desc: 'Final video generation with Veo3. Scene by scene, shot by shot.', phase: 'B' as const },
]

const capabilities = [
  { label: '4 input modes', detail: 'Expand an idea, condense a novel, transform existing content, or upload a script.' },
  { label: 'Visual continuity', detail: 'Asset inheritance, rearview mirror, drift detection, frame anchoring.' },
  { label: 'Cost gating', detail: 'Pre-generation estimates, checkout stage, speed vs quality modes.' },
  { label: 'Multi-provider AI', detail: 'OpenAI, Anthropic, Gemini for text. Nano Banana for frames. Google Veo3 for video.' },
]

const pricingFeatures = [
  'Full 12-stage pipeline',
  'Unlimited projects & scenes',
  'Multi-provider AI stack',
  'Git-style branching',
  'Visual continuity engine',
  'Real-time cost tracking',
  'Professional screenplay editor',
]

/* ─── Theme palettes (OKLCH) ─── */

const palettes: Record<'dark' | 'light', Record<string, string>> = {
  dark: {
    '--l-bg': 'oklch(9% 0.015 260)',
    '--l-bg-alpha': 'oklch(9% 0.015 260 / 0.9)',
    '--l-surface': 'oklch(13% 0.012 260)',
    '--l-accent': 'oklch(75% 0.16 65)',
    '--l-text': 'oklch(95% 0.01 75)',
    '--l-text-soft': 'oklch(75% 0.01 75)',
    '--l-muted': 'oklch(55% 0.015 260)',
    '--l-line': 'oklch(22% 0.012 260)',
    '--l-dim': 'oklch(35% 0.012 260)',
    '--l-crosshair': 'oklch(28% 0.012 260)',
    '--l-placeholder': 'oklch(40% 0.012 260)',
    '--l-caption': 'oklch(50% 0.012 260)',
  },
  light: {
    '--l-bg': 'oklch(97% 0.005 75)',
    '--l-bg-alpha': 'oklch(97% 0.005 75 / 0.9)',
    '--l-surface': 'oklch(93% 0.008 75)',
    '--l-accent': 'oklch(55% 0.18 65)',
    '--l-text': 'oklch(15% 0.015 260)',
    '--l-text-soft': 'oklch(30% 0.015 260)',
    '--l-muted': 'oklch(45% 0.015 260)',
    '--l-line': 'oklch(85% 0.008 75)',
    '--l-dim': 'oklch(60% 0.01 260)',
    '--l-crosshair': 'oklch(80% 0.008 75)',
    '--l-placeholder': 'oklch(65% 0.01 260)',
    '--l-caption': 'oklch(55% 0.01 260)',
  },
}

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

const SERIF = "'Fraunces Variable', 'Fraunces', Georgia, serif"

/* ─── Scoped hover styles (avoids inline-style specificity issues) ─── */

const scopedCSS = `
  .l-link { color: var(--l-muted); }
  .l-link:hover { color: var(--l-accent); }
  .l-outline-btn { color: var(--l-muted); border-color: var(--l-line); }
  .l-outline-btn:hover { color: var(--l-accent); border-color: var(--l-accent); }
`

/* ─── Component ─── */

export function Landing() {
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('landing-theme') as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('landing-theme', next) } catch { /* noop */ }
      return next
    })
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <style>{scopedCSS}</style>

      <div
        className="min-h-screen overflow-x-hidden"
        style={{
          ...palettes[theme],
          fontFamily: "'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif",
          backgroundColor: 'var(--l-bg)',
          color: 'var(--l-text)',
          transition: 'background-color 0.4s ease-out',
        } as React.CSSProperties}
      >
        {/* ── Nav ── */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 border-b"
          style={{ borderColor: 'var(--l-line)', backgroundColor: 'var(--l-bg-alpha)', backdropFilter: 'blur(8px)' }}
        >
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
            <span className="text-sm font-medium tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
              AIUTEUR
            </span>
            <div className="flex items-center gap-8">
              <button onClick={() => scrollTo('pipeline')} className="l-link hidden sm:block text-xs uppercase tracking-[0.2em] transition-colors duration-200">
                Process
              </button>
              <button onClick={() => scrollTo('pricing')} className="l-link hidden sm:block text-xs uppercase tracking-[0.2em] transition-colors duration-200">
                Pricing
              </button>
              <button onClick={() => navigate('/auth')} className="l-link hidden sm:block text-xs uppercase tracking-[0.2em] transition-colors duration-200">
                Log In
              </button>

              {/* Theme toggle — hollow circle (dark) / filled circle (light) */}
              <button
                onClick={toggleTheme}
                className="h-3.5 w-3.5 rounded-full border transition-all duration-300"
                style={{
                  borderColor: 'var(--l-muted)',
                  backgroundColor: theme === 'light' ? 'var(--l-text)' : 'transparent',
                }}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              />

              <button
                onClick={() => navigate('/auth')}
                className="text-xs font-medium uppercase tracking-[0.15em] px-5 py-2 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ backgroundColor: 'var(--l-accent)', color: 'var(--l-bg)' }}
              >
                Start Production
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="px-6 lg:px-8 pt-32 pb-24 lg:pb-32">
          <div className="mx-auto max-w-7xl">
            <motion.p
              className="text-xs uppercase tracking-[0.3em] mb-8"
              style={{ color: 'var(--l-accent)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EXPO_OUT }}
            >
              Deterministic AI Filmmaking
            </motion.p>

            <motion.h1
              className="leading-[0.9] tracking-tight mb-12"
              style={{
                fontFamily: SERIF,
                fontSize: 'clamp(3rem, 9vw, 7.5rem)',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: EXPO_OUT }}
            >
              From Narrative
              <br />
              <span style={{ color: 'var(--l-muted)', fontStyle: 'normal' }}>to</span>{' '}
              Film.
            </motion.h1>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EXPO_OUT }}
            >
              <div className="md:col-span-7">
                <p className="text-xl sm:text-2xl leading-relaxed max-w-2xl" style={{ color: 'var(--l-muted)' }}>
                  A{' '}
                  <span style={{ color: 'var(--l-text)' }}>deterministic 12-stage pipeline</span>{' '}
                  that transforms script to screen. No credit-roulette. Just creative engineering.
                </p>
                <div className="flex flex-wrap gap-4 mt-10">
                  <button
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.1em] px-7 py-3 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--l-accent)', color: 'var(--l-bg)' }}
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scrollTo('pipeline')}
                    className="l-outline-btn text-sm uppercase tracking-[0.1em] px-7 py-3 border transition-colors duration-200"
                  >
                    See the Pipeline
                  </button>
                </div>
              </div>

              <div className="md:col-span-5">
                <MediaSlot alt="Pipeline overview" aspectRatio="4/3" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Problem / Solution ── */}
        <section className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
            <ScrollReveal direction="up">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                <div className="md:col-span-5">
                  <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--l-accent)' }}>
                    The Problem
                  </p>
                  <h2
                    className="text-3xl sm:text-4xl leading-tight tracking-tight"
                    style={{ fontFamily: SERIF, fontWeight: 700 }}
                  >
                    Generate. Hope.
                    <br />
                    <span style={{ color: 'var(--l-muted)' }}>Waste credits.</span>
                  </h2>
                </div>
                <div className="md:col-span-7 flex flex-col gap-8">
                  <p className="text-lg leading-relaxed" style={{ color: 'var(--l-muted)' }}>
                    Traditional AI video has no structure, no continuity, and no cost control.
                    Every render is a gamble with your budget and your creative vision.
                  </p>
                  <div className="border-l-2 pl-6" style={{ borderColor: 'var(--l-accent)' }}>
                    <p className="text-lg leading-relaxed" style={{ color: 'var(--l-text)' }}>
                      Aiuteur inverts the process:{' '}
                      <span style={{ color: 'var(--l-accent)' }}>Plan → Anchor → Generate.</span>
                      {' '}Build your story, lock your assets, preview with cheap reference frames, then
                      render with confidence.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── 12-Stage Pipeline — Vertical Production Stack ── */}
        <section id="pipeline" className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Pipeline header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end py-12 gap-4">
              <ScrollReveal direction="up">
                <h2
                  className="text-4xl sm:text-5xl tracking-tight"
                  style={{ fontFamily: SERIF, fontWeight: 700 }}
                >
                  The 12-Stage Pipeline
                </h2>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <p className="text-xs uppercase tracking-[0.2em] pb-1" style={{ color: 'var(--l-muted)' }}>
                  Linear Production Flow ↓
                </p>
              </ScrollReveal>
            </div>

            {/* Phase A label */}
            <div className="border-t py-3" style={{ borderColor: 'var(--l-line)' }}>
              <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--l-accent)' }}>
                Phase A — Global Narrative Engine
              </p>
            </div>

            {/* Stage rows */}
            <div className="border-t" style={{ borderColor: 'var(--l-line)' }}>
              {stages.map((stage, i) => (
                <ScrollReveal key={stage.num} direction="fade" delay={i * 0.04}>
                  {/* Phase B label before stage 06 */}
                  {stage.num === '06' && (
                    <div className="border-b py-3" style={{ borderColor: 'var(--l-line)' }}>
                      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--l-accent)' }}>
                        Phase B — Production Engine
                      </p>
                    </div>
                  )}
                  <div
                    className="group flex flex-wrap md:flex-nowrap items-center gap-6 md:gap-12 py-8 md:py-10 border-b transition-[background-color,padding] duration-[400ms] hover:pl-4"
                    style={{ borderColor: 'var(--l-line)', transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                  >
                    <span
                      className="text-4xl md:text-5xl font-light shrink-0 tabular-nums"
                      style={{ color: 'var(--l-accent)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {stage.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-medium uppercase tracking-tight">
                        {stage.name}
                      </h3>
                      <p className="text-sm mt-1 max-w-md" style={{ color: 'var(--l-muted)' }}>
                        {stage.desc}
                      </p>
                    </div>
                    <div className="hidden lg:block w-48 xl:w-56 shrink-0">
                      <MediaSlot alt={`Stage ${stage.num} UI`} aspectRatio="16/9" />
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] uppercase tracking-[0.2em] px-4 py-2 border shrink-0 whitespace-nowrap"
                      style={{ borderColor: 'var(--l-accent)', color: 'var(--l-accent)' }}
                      tabIndex={-1}
                    >
                      Explore Stage
                    </button>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Capabilities — Alternating asymmetric rows ── */}
        <section className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
            <ScrollReveal direction="up">
              <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--l-accent)' }}>
                Capabilities
              </p>
              <h2
                className="text-4xl sm:text-5xl tracking-tight mb-20"
                style={{ fontFamily: SERIF, fontWeight: 700 }}
              >
                Built for the process,
                <br />
                <span style={{ color: 'var(--l-muted)' }}>not the prompt.</span>
              </h2>
            </ScrollReveal>

            <div className="flex flex-col">
              {capabilities.map((cap, i) => (
                <ScrollReveal key={cap.label} direction="up" delay={i * 0.08}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 py-10 border-t"
                    style={{ borderColor: 'var(--l-line)' }}
                  >
                    <div className="md:col-span-4">
                      <h3 className="text-lg font-medium uppercase tracking-tight">
                        {cap.label}
                      </h3>
                    </div>
                    <div className="md:col-span-5">
                      <p className="text-base leading-relaxed" style={{ color: 'var(--l-muted)' }}>
                        {cap.detail}
                      </p>
                    </div>
                    <div className="md:col-span-3">
                      <MediaSlot alt={`${cap.label} screenshot`} aspectRatio="4/3" />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works — Three editorial steps ── */}
        <section className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
            <ScrollReveal direction="up">
              <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--l-accent)' }}>
                Workflow
              </p>
              <h2
                className="text-4xl sm:text-5xl tracking-tight mb-20"
                style={{ fontFamily: SERIF, fontWeight: 700 }}
              >
                Write. Design.{' '}
                <span style={{ fontStyle: 'italic' }}>Produce.</span>
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--l-line)' }}>
              {[
                {
                  num: '01',
                  title: 'Write',
                  desc: 'Start with any narrative input. AI helps you build a full screenplay — treatments, beat sheets, professional formatting.',
                  media: 'Screenplay editor',
                },
                {
                  num: '02',
                  title: 'Design',
                  desc: 'Define your visual world. Characters, locations, props — all locked for consistency before a single frame is generated.',
                  media: 'Asset management UI',
                },
                {
                  num: '03',
                  title: 'Produce',
                  desc: 'Generate anchor frames cheaply, review costs, then render final video with Veo3. Scene by scene, shot by shot.',
                  media: 'Video timeline',
                },
              ].map((step, i) => (
                <ScrollReveal key={step.num} direction="up" delay={i * 0.12}>
                  <div className="flex flex-col gap-6 p-8 lg:p-10" style={{ backgroundColor: 'var(--l-bg)' }}>
                    <span
                      className="text-5xl font-light"
                      style={{ color: 'var(--l-accent)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {step.num}
                    </span>
                    <h3
                      className="text-2xl tracking-tight"
                      style={{ fontFamily: SERIF, fontWeight: 700 }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--l-muted)' }}>
                      {step.desc}
                    </p>
                    <MediaSlot alt={step.media} aspectRatio="16/9" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
            <ScrollReveal direction="up">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                <div className="md:col-span-5">
                  <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--l-accent)' }}>
                    Pricing
                  </p>
                  <h2
                    className="text-4xl sm:text-5xl tracking-tight"
                    style={{ fontFamily: SERIF, fontWeight: 700 }}
                  >
                    One plan.
                    <br />
                    <span style={{ fontStyle: 'italic' }}>Full pipeline.</span>
                  </h2>
                </div>

                <div className="md:col-span-7">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className="text-6xl sm:text-7xl font-light tracking-tight"
                      style={{ fontFamily: SERIF, color: 'var(--l-accent)' }}
                    >
                      $6.66
                    </span>
                    <span className="text-sm" style={{ color: 'var(--l-muted)' }}>/month</span>
                  </div>

                  <p className="text-sm mb-10" style={{ color: 'var(--l-muted)' }}>
                    14-day free trial. Bring your own API keys.
                  </p>

                  <ul className="flex flex-col gap-3 mb-10">
                    {pricingFeatures.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-sm">
                        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--l-accent)' }} />
                        <span style={{ color: 'var(--l-text-soft)' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.1em] px-7 py-3 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--l-accent)', color: 'var(--l-bg)' }}
                  >
                    Start Your Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t" style={{ borderColor: 'var(--l-line)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-sm tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
              AIUTEUR
            </span>
            <div className="flex items-center gap-8">
              <button onClick={() => navigate('/auth')} className="l-link text-xs uppercase tracking-[0.15em] transition-colors duration-200">
                Sign Up
              </button>
              <button onClick={() => navigate('/auth')} className="l-link text-xs uppercase tracking-[0.15em] transition-colors duration-200">
                Log In
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--l-dim)' }}>
              &copy; {new Date().getFullYear()} Aiuteur
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
