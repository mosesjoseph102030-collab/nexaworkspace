import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import {
  ArrowRight, MessageSquareDot, Zap, Shield, Sparkles,
  Moon, Sun, CheckCircle2, Bot, Star, Users, Bell,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { workspaceApi } from '@/api/endpoints/workspace'
import { useTheme } from '@/theme/ThemeProvider'

// ── Utility ──────────────────────────────────────────────────────────────────

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const onScroll = () => setY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return y
}

function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Live chat preview ─────────────────────────────────────────────────────────

const chatMessages = [
  { id: 1, text: 'Morning team! Anyone covering the 9am shift?', own: true, name: 'Felix', delay: 0.2 },
  { id: 2, text: "I'll be there by 8:45 🙋‍♀️", own: false, name: 'Maria', avatar: 'M', delay: 0.9 },
  { id: 3, text: 'Great. I approved your request btw!', own: true, name: 'Felix', delay: 1.6 },
  { id: 4, text: 'Thank you! So happy to be on the team 🎉', own: false, name: 'Maria', avatar: 'M', delay: 2.3 },
]

function ChatPreview() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border-2 border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_32px_80px_rgba(99,102,241,0.18),0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1 bg-[var(--surface)]">
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-12 h-4 rounded-full bg-[var(--surface-overlay)]" />
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-[11px]">N</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">Felix Bakery</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-500">3 online</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Bell size={13} className="text-[var(--text-muted)]" />
          </div>
        </div>

        {/* Messages */}
        <div className="px-3 py-3 space-y-2 min-h-[180px] bg-[var(--surface-raised)]">
          {chatMessages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: msg.delay, duration: 0.3, ease: 'easeOut' }}
              className={['flex items-end gap-1.5', msg.own ? 'flex-row-reverse' : ''].join(' ')}
            >
              {!msg.own && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mb-0.5">
                  {msg.avatar}
                </div>
              )}
              <div className={['flex flex-col gap-0.5', msg.own ? 'items-end' : 'items-start'].join(' ')}>
                <span className="text-[9px] text-[var(--text-muted)] px-1">{msg.name}</span>
                <div
                  className={[
                    'px-2.5 py-1.5 rounded-2xl text-[11px] leading-relaxed max-w-[180px]',
                    msg.own
                      ? 'rounded-br-sm text-white'
                      : 'rounded-bl-sm bg-[var(--surface-overlay)] text-[var(--text-primary)]',
                  ].join(' ')}
                  style={msg.own ? { background: 'var(--bubble-own)' } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}

          {/* AI suggestion chips */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.1, duration: 0.4 }}
            className="flex items-center gap-1.5 pt-1 flex-wrap"
          >
            <Sparkles size={9} className="text-brand-500 flex-shrink-0" />
            {["Thanks!", "On it 👍", "Great news!"].map(s => (
              <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 cursor-pointer hover:bg-brand-500/20 transition-colors">
                {s}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--surface)] border-t border-[var(--border)]">
          <div className="flex-1 h-7 rounded-xl bg-[var(--surface-overlay)] px-2.5 flex items-center">
            <span className="text-[10px] text-[var(--text-muted)]">Message…</span>
          </div>
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-bubble">
            <ArrowRight size={12} className="text-white" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.4, type: 'spring', stiffness: 200 }}
        className="hidden sm:block absolute -right-8 top-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-3 py-2 shadow-glass dark:shadow-glass-dark"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[9px] font-bold">J</div>
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-primary)]">John wants to join</p>
            <p className="text-[9px] text-[var(--text-muted)]">Tap to approve</p>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 2.8, duration: 0.4, type: 'spring', stiffness: 200 }}
        className="hidden sm:block absolute -left-8 bottom-24 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-3 py-2 shadow-glass dark:shadow-glass-dark"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <Bot size={11} className="text-white" />
          </div>
          <p className="text-[10px] font-semibold text-[var(--text-primary)]">AI summarised 42 msgs</p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, label, desc, iconBg, iconColor, delay }: {
  icon: LucideIcon
  label: string; desc: string; iconBg: string; iconColor: string; delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-40, 40], [6, -6])
  const rotateY = useTransform(x, [-40, 40], [-6, 6])

  return (
    <FadeUp delay={delay}>
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={e => {
          const r = ref.current?.getBoundingClientRect()
          if (!r) return
          x.set(e.clientX - r.left - r.width / 2)
          y.set(e.clientY - r.top - r.height / 2)
        }}
        onMouseLeave={() => { x.set(0); y.set(0) }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="group h-full flex flex-col gap-4 p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] hover:border-brand-500/30 hover:shadow-bubble transition-all duration-300 cursor-default"
      >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1.5">{label}</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    </FadeUp>
  )
}

// ── Showcase card ─────────────────────────────────────────────────────────────

function ShowcaseCard({ card, delay }: {
  card: typeof showcaseCards[0]; delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-50, 50], [5, -5])
  const rotateY = useTransform(x, [-50, 50], [-5, 5])

  return (
    <FadeUp delay={delay}>
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={e => {
          const r = ref.current?.getBoundingClientRect()
          if (!r) return
          x.set(e.clientX - r.left - r.width / 2)
          y.set(e.clientY - r.top - r.height / 2)
        }}
        onMouseLeave={() => { x.set(0); y.set(0) }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`h-full flex flex-col gap-4 p-5 rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} cursor-default`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-black text-[var(--text-primary)] leading-none">{card.stat}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.statLabel}</p>
          </div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
        </div>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1 italic opacity-90">
          "{card.quote}"
        </p>
        <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {card.avatar}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{card.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{card.role}</p>
          </div>
        </div>
      </motion.div>
    </FadeUp>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  { icon: MessageSquareDot, label: 'Real-time messaging', desc: 'WebSocket-powered. Messages arrive instantly across all devices. No refresh, no lag.', iconBg: 'bg-brand-500/10', iconColor: 'text-brand-500' },
  { icon: Shield, label: 'Owner-gated access', desc: 'Every member must be approved by you. Your workspace, your rules. No strangers.', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { icon: Bot, label: 'Built-in AI assistant', desc: 'Smart reply suggestions, conversation summaries, context-aware help — all within your workspace.', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
  { icon: Zap, label: 'One link to join', desc: 'Share one URL. Staff click it, enter their name, request access. Done. No app stores.', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
]

const showcaseCards = [
  {
    title: 'Bakery team',
    quote: 'No more missed shift messages. The owner approves who joins, and the AI summarises shifts so I never miss context.',
    name: 'Felix O.',
    role: 'Bakery owner, Lagos',
    avatar: 'F',
    stat: '12',
    statLabel: 'staff on one workspace',
    gradient: 'from-brand-500/15 to-brand-700/8',
    border: 'border-brand-500/20',
  },
  {
    title: 'Retail team',
    quote: 'Before NEXACHAT our manager had to send the same message 4 times. Now everyone is in one place and I approve each person manually.',
    name: 'Adaeze K.',
    role: 'Store manager, Abuja',
    avatar: 'A',
    stat: '3 min',
    statLabel: 'average response time',
    gradient: 'from-emerald-500/12 to-teal-500/8',
    border: 'border-emerald-500/20',
  },
  {
    title: 'Remote ops team',
    quote: 'AI summaries save me 30 minutes every morning. I just open NEXACHAT, tap Summarise, and I know what happened overnight.',
    name: 'Kwame B.',
    role: 'Operations lead, Accra',
    avatar: 'K',
    stat: '30 min',
    statLabel: 'saved every morning',
    gradient: 'from-purple-500/12 to-violet-500/8',
    border: 'border-purple-500/20',
  },
]

const steps = [
  { n: '01', title: 'Create workspace', desc: 'Pick your business name. Get a unique link instantly.' },
  { n: '02', title: 'Share your link', desc: 'Send it via WhatsApp, SMS, or email. No app download needed.' },
  { n: '03', title: 'Approve requests', desc: 'Staff request to join. You approve with a single tap.' },
  { n: '04', title: 'Chat in real time', desc: 'Instant messages, presence, AI assistant, full history.' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const scrollY = useScrollY()
  const navScrolled = scrollY > 20

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault()
    const s = slug.trim().toLowerCase()
    if (!s) return
    setError('')
    setLoading(true)
    try {
      await workspaceApi.getBySlug(s)
      navigate(`/${s}`)
    } catch {
      setError('Workspace not found.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)] overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className={[
          'fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-8 transition-all duration-300',
          navScrolled
            ? 'bg-[var(--surface)]/95 backdrop-blur-xl border-b border-[var(--border)] shadow-sm'
            : 'bg-transparent',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-extrabold text-[var(--text-primary)] text-base tracking-tight">NEXACHAT</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => navigate('/login')} className="hidden sm:block px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Sign in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-bubble whitespace-nowrap"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Fixed nav spacer — ensures content never hides behind nav */}
      <div className="h-14 flex-shrink-0" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-screen flex flex-col items-center px-4 pt-16 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">

        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-brand-500/6 dark:bg-brand-500/10 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/6 dark:bg-purple-500/8 blur-[100px]" />
          <div className="absolute top-[40%] left-[5%] w-[200px] h-[200px] rounded-full bg-emerald-500/4 blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left — text */}
          <div className="flex-1 min-w-0 text-center lg:text-left w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold mb-6">
                <Sparkles size={11} />
                AI-powered · Real-time · Private
              </div>

              <h1 className="text-[1.75rem] xs:text-[2.2rem] sm:text-5xl lg:text-[3.5rem] font-extrabold text-[var(--text-primary)] leading-[1.15] tracking-tight mb-5 break-words w-full">
                <span>Your team's </span>
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-purple-500 bg-clip-text text-transparent">
                    private workspace
                  </span>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 to-purple-500 origin-left"
                  />
                </span>
                <span className="block mt-1">not another group chat</span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">
                Replace the chaos of WhatsApp groups. One link, owner-controlled access, real-time chat, and an AI assistant that keeps everyone in sync.
              </p>

              {/* Workspace entry */}
              <form onSubmit={handleEnter} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto lg:mx-0 mb-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">
                    nexachat.app/
                  </span>
                  <input
                    value={slug}
                    onChange={e => { setSlug(e.target.value); setError('') }}
                    placeholder="yourworkspace"
                    className={[
                      'w-full pl-[7.5rem] pr-4 py-2.5 rounded-xl text-sm',
                      'bg-[var(--surface-raised)] border text-[var(--text-primary)]',
                      'placeholder:text-[var(--text-muted)]',
                      'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
                      'transition-colors duration-150',
                      error ? 'border-red-500' : 'border-[var(--border)] hover:border-brand-400',
                    ].join(' ')}
                    aria-label="Workspace name"
                  />
                  {error && <p className="absolute -bottom-5 left-0 text-xs text-red-500">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-bubble disabled:opacity-60 flex-shrink-0"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Open <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <p className="text-xs text-[var(--text-muted)] text-center lg:text-left">
                New here?{' '}
                <button onClick={() => navigate('/register')} className="text-brand-500 font-semibold hover:underline">
                  Create your workspace free →
                </button>
              </p>

              {/* Social proof */}
              <div className="flex items-center gap-3 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-1.5">
                  {['F', 'A', 'K', 'M', 'J'].map((l, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--surface)] bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[8px] font-bold">
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">500+</span> teams already using NEXACHAT
                </p>
              </div>
          </div>

          {/* Right — phone mockup — shown below text on mobile, right on desktop */}
          <div className="order-last lg:order-none flex-shrink-0 w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[340px] mx-auto lg:mx-0">
            <ChatPreview />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="mt-12 flex flex-col items-center gap-1.5 opacity-40">
          <div className="w-4 h-7 rounded-full border border-[var(--border)] flex items-start justify-center pt-1">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-0.5 h-1.5 rounded-full bg-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-3">Everything you need</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Messaging that works for real businesses
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.label} {...f} delay={i * 0.07} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-3">Simple by design</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Up and running in 4 steps</h2>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <FadeUp key={step.n} delay={i * 0.08}>
                <div className="relative flex flex-col gap-3 p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] hover:border-brand-500/30 transition-colors">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-2 w-4 h-px bg-[var(--border)] z-10" />
                  )}
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-brand-500">{step.n}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{step.title}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase ─────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20 sm:py-28 bg-[var(--surface-raised)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-3">Real teams. Real results.</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Built for how work actually happens
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-3 max-w-md mx-auto">
              From bakeries to remote ops teams — NEXACHAT replaces the chaos with clarity.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {showcaseCards.map((card, i) => (
              <ShowcaseCard key={card.name} card={card} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Combined CTA + Stats — split card ────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]">

              {/* Background accent */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/8 dark:bg-brand-500/14 blur-[60px]" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-purple-500/6 dark:bg-purple-500/10 blur-[50px]" />
              </div>

              <div className="relative flex flex-col lg:flex-row">

                {/* Left — CTA */}
                <div className="flex-1 flex flex-col justify-center gap-6 p-8 sm:p-12 lg:pr-8">
                  <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold">
                    <CheckCircle2 size={11} />
                    Free to start — no card needed
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] leading-tight mb-3">
                      Your team deserves better than{' '}
                      <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                        a group chat
                      </span>
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-sm">
                      30 seconds to create. One link to share. Owner approval to join. Real-time chat from day one.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/register')}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-bubble"
                    >
                      Create your workspace
                      <ArrowRight size={15} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-brand-500/40 transition-all"
                    >
                      Sign in to existing workspace
                    </motion.button>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-[var(--border)] to-transparent self-stretch" />
                <div className="lg:hidden h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mx-8" />

                {/* Right — Stats */}
                <div className="flex-shrink-0 lg:w-72 flex flex-col justify-center gap-2 p-8 sm:p-10 lg:pl-8">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                    By the numbers
                  </p>

                  {[
                    { val: '500+', label: 'Active teams', sub: 'across all workspaces', icon: Users, color: 'text-brand-500', bg: 'bg-brand-500/10' },
                    { val: '98%', label: 'Uptime SLA', sub: 'guaranteed reliability', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { val: '<100ms', label: 'Message latency', sub: 'real-time WebSocket', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  ].map(({ val, label, sub, icon: Icon, color, bg }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-overlay)] transition-all group cursor-default"
                    >
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-[var(--text-primary)] leading-none">{val}</p>
                        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] px-4 sm:px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-[9px]">N</span>
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)]">NEXACHAT</span>
          </div>

          {/* Centre — tagline */}
          <p className="text-xs text-[var(--text-muted)] text-center">
            Private team messaging for local businesses and small teams
          </p>

          {/* Right — minimal links */}
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/system-monitor')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              System status
            </button>
            <span className="text-[var(--border)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">© 2026 NEXACHAT</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

