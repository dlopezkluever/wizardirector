import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clapperboard,
  Film,
  Sparkles,
  Palette,
  Users,
  MapPin,
  SplitSquareVertical,
  FileText,
  Layers,
  Image,
  Eye,
  DollarSign,
  Video,
  ArrowRight,
  Check,
  PenTool,
  Paintbrush,
  Play,
  Cpu,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollReveal } from '@/components/landing/ScrollReveal'
import { MediaSlot } from '@/components/landing/MediaSlot'

/* ─── Stage data ─── */

const pipelineStages = [
  { num: 1, name: 'Story Seed', desc: 'Expand, condense, transform, or upload your narrative', icon: BookOpen, phase: 'A' },
  { num: 2, name: 'Treatment', desc: 'AI builds a structured treatment from your seed', icon: FileText, phase: 'A' },
  { num: 3, name: 'Beat Sheet', desc: 'Break the treatment into dramatic beats', icon: Layers, phase: 'A' },
  { num: 4, name: 'Screenplay', desc: 'Full screenplay with professional formatting', icon: Clapperboard, phase: 'A' },
  { num: 5, name: 'Asset Bible', desc: 'Lock characters, locations, props & style capsules', icon: Palette, phase: 'A' },
  { num: 6, name: 'Script Hub', desc: 'Scene-by-scene breakdown and navigation', icon: SplitSquareVertical, phase: 'B' },
  { num: 7, name: 'Shot Design', desc: 'Camera angles, composition, and pacing per shot', icon: Film, phase: 'B' },
  { num: 8, name: 'Visual Prompts', desc: 'AI-crafted prompts with continuity awareness', icon: Sparkles, phase: 'B' },
  { num: 9, name: 'Dialogue Polish', desc: 'Refine dialogue with character voice consistency', icon: Users, phase: 'B' },
  { num: 10, name: 'Frame Anchors', desc: 'Generate cheap reference frames before committing', icon: Image, phase: 'B' },
  { num: 11, name: 'Cost Checkout', desc: 'Review costs and choose speed vs quality', icon: DollarSign, phase: 'B' },
  { num: 12, name: 'Render', desc: 'Final video generation with Veo3, scene by scene', icon: Video, phase: 'B' },
]

const features = [
  {
    title: '4 Ways In',
    desc: 'Expand an idea, condense a novel, transform existing content, or upload a script directly.',
    icon: BookOpen,
    media: 'Screenshot of Stage 1 input mode selector',
  },
  {
    title: 'Visual Continuity Engine',
    desc: 'Asset inheritance, rearview mirror, continuity drift detection, and frame anchoring.',
    icon: Eye,
    media: 'Screenshot of continuity tracking UI',
  },
  {
    title: 'Cost Control, Not Surprise',
    desc: 'Pre-generation estimates, Stage 11 gating, and speed vs quality modes.',
    icon: DollarSign,
    media: 'Screenshot of Stage 11 cost checkout view',
  },
  {
    title: 'AI Multi-Provider',
    desc: 'OpenAI, Anthropic, Gemini for text. Nano Banana for frames. Google Veo3 for video.',
    icon: Cpu,
    media: 'Diagram showing provider logos and capabilities',
  },
]

const howItWorks = [
  {
    step: 1,
    title: 'Write',
    desc: 'Start with any narrative input. AI helps you build a full screenplay with treatments, beat sheets, and rich formatting.',
    icon: PenTool,
    media: 'Gif of the screenplay editor in action',
  },
  {
    step: 2,
    title: 'Design',
    desc: 'Define your visual world. Characters, locations, props — all locked for consistency before a single frame is generated.',
    icon: Paintbrush,
    media: 'Screenshot of asset management / Stage 5',
  },
  {
    step: 3,
    title: 'Produce',
    desc: 'Generate anchor frames cheaply, review costs, then render final video with Veo3. Scene by scene, shot by shot.',
    icon: Play,
    media: 'Gif of Stage 12 video generation / timeline',
  },
]

const pricingFeatures = [
  'Full 12-stage pipeline access',
  'Unlimited projects & scenes',
  'Multi-provider AI (text, image, video)',
  'Git-style project branching',
  'Visual continuity engine',
  'Real-time cost tracking',
  'Professional screenplay editor',
]

/* ─── Component ─── */

export function Landing() {
  const navigate = useNavigate()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Nav Bar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="font-display text-xl font-bold text-gradient-gold">
            Aiuteur
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
            >
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── 1. Hero ─── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Subtle radial glow behind headline */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
          <motion.h1
            className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            From Narrative to Film.{' '}
            <span className="text-gradient-gold">Directed by You</span>,
            Powered by AI.
          </motion.h1>

          <motion.p
            className="max-w-2xl text-lg text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          >
            A deterministic 12-stage pipeline that transforms any narrative into
            a fully produced film — with complete creative control and cost
            visibility at every step.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <Button size="xl" onClick={() => navigate('/auth')}>
              Start Free Trial
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => scrollToSection('pipeline')}
            >
              See How It Works
            </Button>
          </motion.div>

          <motion.div
            className="mt-4 w-full max-w-4xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <MediaSlot
              alt="App hero screenshot / demo gif"
              aspectRatio="16/9"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── 2. Problem → Solution ─── */}
      <section className="py-24 px-6">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
          <ScrollReveal direction="left">
            <div className="flex flex-col gap-6">
              <Badge variant="destructive" className="w-fit">
                The Problem
              </Badge>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Traditional AI video ={' '}
                <span className="text-destructive">expensive roulette</span>
              </h2>
              <p className="text-muted-foreground">
                Generate → hope → waste credits. No structure, no continuity, no
                cost control. Every render is a gamble with your budget and your
                vision.
              </p>
              <MediaSlot
                alt="Chaotic AI generation visual or diagram"
                aspectRatio="4/3"
              />
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="flex flex-col gap-6">
              <Badge className="w-fit">The Inversion</Badge>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Plan → Anchor →{' '}
                <span className="text-gradient-gold">Generate</span>
              </h2>
              <p className="text-muted-foreground">
                Aiuteur inverts the process. Build your story, lock your assets,
                preview with cheap frames, then render with confidence. Know your
                costs before you spend.
              </p>
              <MediaSlot
                alt="Clean pipeline flow visual or diagram"
                aspectRatio="4/3"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── 3. 12-Stage Pipeline ─── */}
      <section id="pipeline" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal direction="up" className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              The Pipeline
            </Badge>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              12 Stages. <span className="text-gradient-gold">Zero Guesswork.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From a single idea to a finished film, every stage builds on the
              last with deterministic, auditable outputs.
            </p>
          </ScrollReveal>

          {/* Phase A */}
          <div className="mb-16">
            <ScrollReveal direction="up" className="mb-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                  Phase A — Global Narrative Engine
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
              </div>
            </ScrollReveal>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pipelineStages
                .filter((s) => s.phase === 'A')
                .map((stage, i) => (
                  <ScrollReveal key={stage.num} direction="up" delay={i * 0.1}>
                    <Card className="card-hover glass h-full">
                      <CardHeader className="flex flex-row items-center gap-4 pb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                          <stage.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            Stage {stage.num}
                          </p>
                          <CardTitle className="text-base">
                            {stage.name}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          {stage.desc}
                        </p>
                        <MediaSlot
                          alt={`Stage ${stage.num} — ${stage.name} UI`}
                          aspectRatio="16/9"
                          className="mt-1"
                        />
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ))}
            </div>
          </div>

          {/* Gold connecting line */}
          <ScrollReveal direction="scale" className="my-8 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/60" />
              <Zap className="h-5 w-5 text-primary" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/60" />
            </div>
          </ScrollReveal>

          {/* Phase B */}
          <div>
            <ScrollReveal direction="up" className="mb-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                <span className="text-sm font-semibold uppercase tracking-widest text-accent">
                  Phase B — Production Engine
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-accent/50 to-transparent" />
              </div>
            </ScrollReveal>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pipelineStages
                .filter((s) => s.phase === 'B')
                .map((stage, i) => (
                  <ScrollReveal key={stage.num} direction="up" delay={i * 0.1}>
                    <Card className="card-hover glass h-full">
                      <CardHeader className="flex flex-row items-center gap-4 pb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                          <stage.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                            Stage {stage.num}
                          </p>
                          <CardTitle className="text-base">
                            {stage.name}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          {stage.desc}
                        </p>
                        <MediaSlot
                          alt={`Stage ${stage.num} — ${stage.name} UI`}
                          aspectRatio="16/9"
                          className="mt-1"
                        />
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. Feature Highlights ─── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal direction="up" className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Built for <span className="text-gradient-gold">Filmmakers</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Every feature exists to give you more control, more consistency,
              and more confidence.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} direction="scale" delay={i * 0.1}>
                <Card className="card-hover glass h-full overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <p className="text-muted-foreground">{f.desc}</p>
                    <MediaSlot alt={f.media} aspectRatio="16/9" />
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. How It Works ─── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal direction="up" className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Simple as 1-2-3
            </Badge>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              How It <span className="text-gradient-gold">Works</span>
            </h2>
          </ScrollReveal>

          <div className="flex flex-col gap-16">
            {howItWorks.map((item, i) => (
              <ScrollReveal
                key={item.step}
                direction="right"
                delay={i * 0.15}
              >
                <div className="grid items-center gap-8 md:grid-cols-2">
                  <div className={`flex flex-col gap-4 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary glow-gold">
                        <item.icon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                          Step {item.step}
                        </p>
                        <h3 className="font-display text-2xl font-bold">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                    <MediaSlot alt={item.media} aspectRatio="16/9" />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Pricing ─── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-md">
          <ScrollReveal direction="scale">
            <Card className="relative overflow-hidden border-primary/30 glow-gold">
              {/* Gold top accent */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />

              <CardHeader className="text-center">
                <Badge className="mx-auto mb-2 w-fit">14-Day Free Trial</Badge>
                <CardTitle className="font-display text-3xl">
                  Aiuteur Pro
                </CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="font-display text-5xl font-bold text-gradient-gold">
                    $6.66
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bring your own API keys (OpenAI, Anthropic, Google Cloud)
                </p>
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                <ul className="flex flex-col gap-3">
                  {pricingFeatures.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-3 text-sm text-foreground"
                    >
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  size="xl"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  Start Your Free Trial
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── 7. Footer ─── */}
      <ScrollReveal direction="fade">
        <footer className="border-t border-border/30 py-12 px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <span className="font-display text-xl font-bold text-gradient-gold">
                Aiuteur
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                AI narrative-to-film pipeline
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button
                onClick={() => navigate('/auth')}
                className="hover:text-foreground transition-colors"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="hover:text-foreground transition-colors"
              >
                Log In
              </button>
            </div>

            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Aiuteur. All rights reserved.
            </p>
          </div>
        </footer>
      </ScrollReveal>
    </div>
  )
}
