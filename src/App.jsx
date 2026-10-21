import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock3,
  Flower2,
  Gift,
  Heart,
  IndianRupee,
  MapPin,
  Menu,
  PartyPopper,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import './App.css'

const eventTypes = [
  { id: 'Birthday', icon: Gift, note: 'Make it their kind of magic' },
  { id: 'Wedding', icon: Heart, note: 'A day worth remembering' },
  { id: 'Community Event', icon: Users, note: 'Bring everyone together' },
]

const today = new Date()
const dateMinimum = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const currentYear = today.getFullYear()

const initialForm = {
  eventType: 'Birthday',
  date: '',
  location: '',
  guests: '50',
  budget: '75000',
}

function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function isPlanResponse(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.title === 'string' &&
    value.theme &&
    typeof value.theme.name === 'string' &&
    value.budget &&
    Array.isArray(value.budget.items) &&
    Array.isArray(value.timeline) &&
    Array.isArray(value.vendors) &&
    value.catering &&
    Array.isArray(value.catering.menu) &&
    Array.isArray(value.activities)
  )
}

function Brand({ light = false }) {
  return (
    <a className={`brand${light ? ' brand-light' : ''}`} href="#home" aria-label="CelebrateAI home">
      <span className="brand-mark"><Flower2 size={19} strokeWidth={2.1} /></span>
      <span>celebrate<span className="brand-ai">ai</span></span>
    </a>
  )
}

function SectionEyebrow({ children, light = false }) {
  return <span className={`eyebrow${light ? ' eyebrow-light' : ''}`}><Sparkles size={13} />{children}</span>
}

function EventTypePicker({ value, onChange, disabled }) {
  return (
    <fieldset className="event-type-field">
      <legend className="field-label">What are we celebrating?</legend>
      <div className="event-type-options">
        {eventTypes.map(({ id, icon: Icon, note }) => (
          <label className={`event-type-option${value === id ? ' is-selected' : ''}`} key={id}>
            <input
              type="radio"
              name="eventType"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              disabled={disabled}
            />
            <span className="event-type-icon"><Icon size={18} /></span>
            <span className="event-type-copy"><strong>{id}</strong><small>{note}</small></span>
            <span className="radio-dot" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function TextField({ label, icon: Icon, ...props }) {
  return (
    <label className="form-field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        {Icon && <Icon className="input-icon" size={17} aria-hidden="true" />}
        <input {...props} />
      </span>
    </label>
  )
}

function PlannerForm({ onSubmit, loading }) {
  const [form, setForm] = useState(initialForm)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit({
      ...form,
      guests: Number(form.guests),
      budget: Number(form.budget),
    })
  }

  return (
    <form className="planner-form" onSubmit={handleSubmit}>
      <EventTypePicker value={form.eventType} onChange={(value) => update('eventType', value)} disabled={loading} />
      <div className="form-grid">
        <TextField
          label="Event date"
          icon={CalendarDays}
          type="date"
          value={form.date}
          disabled={loading}
          min={dateMinimum}
          onChange={(event) => update('date', event.target.value)}
          required
        />
        <TextField
          label="Where's the celebration?"
          icon={MapPin}
          type="text"
          placeholder="City or venue"
          value={form.location}
          disabled={loading}
          onChange={(event) => update('location', event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
        <TextField
          label="Guest count"
          icon={Users}
          type="number"
          min="1"
          max="1000"
          placeholder="50"
          value={form.guests}
          disabled={loading}
          onChange={(event) => update('guests', event.target.value)}
          required
        />
        <TextField
          label="Your budget (INR)"
          icon={IndianRupee}
          type="number"
          min="1000"
          max="100000000"
          step="500"
          placeholder="75000"
          value={form.budget}
          disabled={loading}
          onChange={(event) => update('budget', event.target.value)}
          required
        />
      </div>
      <p className="form-note"><CheckCircle2 size={15} /> Your budget stays in your control. Always.</p>
      <button className="button button-primary button-wide" type="submit" disabled={loading}>
        {loading ? <><span className="button-spinner" /> Dreaming up your day...</> : <><WandSparkles size={17} /> Create my celebration plan <ArrowRight size={17} /></>}
      </button>
      <p className="privacy-note">Made just for you, with a little help from AI.</p>
    </form>
  )
}

function StatCard({ icon: Icon, value, label }) {
  return <div className="stat-card"><span className="stat-icon"><Icon size={17} /></span><div><strong>{value}</strong><span>{label}</span></div></div>
}

function PlanSection({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`plan-section ${className}`}>
      <div className="plan-section-heading"><span className="plan-section-icon"><Icon size={18} /></span><h3>{title}</h3></div>
      {children}
    </section>
  )
}

function PlanResults({ plan, request, onStartOver }) {
  const total = plan.budget.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const budget = request.budget
  const budgetUsed = budget ? Math.min(100, (total / budget) * 100) : 0
  const date = new Date(`${request.date}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const priorities = { high: 'Priority', medium: 'Recommended', low: 'Optional' }

  return (
    <section className="results-section" id="your-plan" aria-labelledby="results-title">
      <div className="results-topline">
        <div><SectionEyebrow>Your celebration, thoughtfully planned</SectionEyebrow><h2 id="results-title">{plan.title}</h2></div>
        <button className="button button-quiet" type="button" onClick={onStartOver}>Plan another <ArrowUpRight size={16} /></button>
      </div>
      <div className="results-meta">
        <span><CalendarDays size={15} />{date}</span><span><MapPin size={15} />{request.location}</span><span><Users size={15} />{request.guests} guests</span>
      </div>
      <div className="results-grid">
        <div className="results-main">
          <PlanSection title="Your celebration theme" icon={Sparkles} className="theme-section">
            <div className="theme-name-row"><h4>{plan.theme.name}</h4><span className="theme-vibe">{plan.theme.vibe}</span></div>
            <p className="section-description">{plan.theme.description}</p>
            <div className="color-palette" aria-label="Suggested color palette">
              {(plan.theme.palette || []).map((color, index) => <span key={`${color}-${index}`} title={color}>{color}</span>)}
            </div>
            {Array.isArray(plan.theme.styling) && <ul className="simple-list">{plan.theme.styling.map((item, index) => <li key={index}><Check size={15} />{item}</li>)}</ul>}
          </PlanSection>
          <PlanSection title="The run-up to your day" icon={Clock3}>
            <ol className="timeline-list">
              {plan.timeline.map((item, index) => (
                <li key={`${item.when}-${index}`}><span className="timeline-marker">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.when}</strong><p>{item.task}</p></div></li>
              ))}
            </ol>
          </PlanSection>
          <PlanSection title="A little something for everyone" icon={PartyPopper}>
            <ul className="activity-grid">{plan.activities.map((activity, index) => <li key={index}><span><Check size={14} /></span>{activity}</li>)}</ul>
          </PlanSection>
          <PlanSection title="On the menu" icon={ChefHat}>
            <div className="menu-list">{plan.catering.menu.map((dish, index) => <span className="menu-chip" key={index}>{dish}</span>)}</div>
            {plan.catering.welcome_drinks?.length > 0 && <p className="catering-note"><strong>To welcome:</strong> {plan.catering.welcome_drinks.join(' · ')}</p>}
            {plan.catering.dessert && <p className="catering-note"><strong>Something sweet:</strong> {plan.catering.dessert}</p>}
            {plan.catering.dietary_note && <p className="catering-note"><strong>Thoughtful touch:</strong> {plan.catering.dietary_note}</p>}
          </PlanSection>
        </div>
        <aside className="results-side">
          <PlanSection title="The budget, at a glance" icon={IndianRupee} className="budget-section">
            <div className="budget-total"><strong>{formatRupees(total)}</strong><span>of {formatRupees(budget)}</span></div>
            <div className="budget-progress" role="progressbar" aria-label="Estimated budget used" aria-valuenow={Math.round(budgetUsed)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${budgetUsed}%` }} /></div>
            <ul className="budget-list">
              {plan.budget.items.map((item, index) => <li key={index}><span><i style={{ '--dot-color': `var(--budget-${index % 5})` }} />{item.category}</span><strong>{formatRupees(Number(item.amount) || 0)}</strong>{item.notes && <small>{item.notes}</small>}</li>)}
            </ul>
            {plan.budget.savings_tip && <div className="savings-tip"><Sparkles size={15} /><p><strong>A little budget wisdom</strong>{plan.budget.savings_tip}</p></div>}
          </PlanSection>
          <PlanSection title="Your vendor checklist" icon={CheckCircle2}>
            <ul className="vendor-list">
              {plan.vendors.map((vendor, index) => <li key={index}><span className="vendor-check"><Check size={13} /></span><div><strong>{vendor.category}</strong><p>{vendor.notes}</p><small>{priorities[vendor.priority] || 'Recommended'}</small></div></li>)}
            </ul>
          </PlanSection>
        </aside>
      </div>
      <div className="results-footer"><Heart size={16} fill="currentColor" /><span>A starting point for a day that feels like <em>you</em>. Prices are estimates—confirm with local vendors.</span></div>
    </section>
  )
}

function App() {
  const [plan, setPlan] = useState(null)
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  async function createPlan(details) {
    setLoading(true)
    setError('')
    setPlan(null)
    setRequest(null)
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'We couldn’t create your plan just now. Please try again.')
      }
      if (!isPlanResponse(result?.plan)) {
        throw new Error('The planner returned an incomplete plan. Please try again.')
      }
      setPlan(result.plan)
      setRequest(details)
      window.setTimeout(() => document.getElementById('your-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something unexpected happened. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function startOver() {
    setPlan(null)
    setRequest(null)
    setError('')
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="nav-inner" aria-label="Main navigation">
          <Brand />
          <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          <div className={`nav-links${menuOpen ? ' nav-open' : ''}`}>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#planner" onClick={() => setMenuOpen(false)}>The planner</a>
            <a className="nav-cta" href="#planner" onClick={() => setMenuOpen(false)}>Plan your event <ArrowUpRight size={15} /></a>
          </div>
        </nav>
      </header>

      <main id="home">
        <section className="hero-section">
          <div className="hero-copy">
            <SectionEyebrow>Big feelings. Beautifully planned.</SectionEyebrow>
            <h1>Make room for<br />the <span>good stuff.</span></h1>
            <p className="hero-description">The people. The little moments. The “you had to be there” stories. We’ll help you plan a celebration that feels like <em>you</em>.</p>
            <a className="button button-primary hero-button" href="#planner">Let’s make it happen <ArrowRight size={17} /></a>
            <div className="hero-social-proof"><div className="avatar-stack"><span>A</span><span>M</span><span>R</span><span>S</span></div><p><strong>More joy, less juggling.</strong><br />A little planning magic goes a long way.</p></div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo" role="img" aria-label="A candlelit celebration table set with flowers and a birthday cake" />
            <div className="photo-shade" />
            <div className="hero-note"><span className="note-flower"><Flower2 size={21} /></span><p><strong>Make it memorable</strong><span>We'll handle the details.</span></p><Sparkles size={19} className="note-sparkle" /></div>
            <div className="floating-tag"><span><Check size={13} /></span>Thoughtfully planned</div>
            <span className="visual-orbit orbit-one" /><span className="visual-orbit orbit-two" />
          </div>
          <div className="hero-scroll"><span>Scroll to find your sparkle</span><ArrowDown size={15} /></div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><SectionEyebrow>A thoughtful plan, in a few clicks</SectionEyebrow><h2>Less spreadsheet.<br /><span>More confetti.</span></h2><p>From “we should celebrate” to “that was incredible”—we’re here for the whole journey.</p></div>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><span className="step-icon"><Heart size={20} /></span><h3>Tell us what matters</h3><p>Pick your occasion, set a date, and share your guest count and budget.</p></article>
            <article className="step-card"><span className="step-number">02</span><span className="step-icon"><WandSparkles size={20} /></span><h3>Get your bright ideas</h3><p>Our AI turns your details into a personal theme, timeline, menu, and more.</p></article>
            <article className="step-card"><span className="step-number">03</span><span className="step-icon"><PartyPopper size={20} /></span><h3>Make it your own</h3><p>A clear plan, a calmer to-do list, and more time to enjoy the moment.</p></article>
          </div>
        </section>

        <section className="planner-section" id="planner">
          <div className="planner-intro">
            <SectionEyebrow light>Your next favorite memory starts here</SectionEyebrow>
            <h2>A little detail<br />makes a <span>big day.</span></h2>
            <p>Give us the basics. We’ll help you turn them into something wonderful.</p>
            <div className="planner-perks"><span><Check size={15} />Personalized ideas</span><span><Check size={15} />Budget-conscious suggestions</span><span><Check size={15} />Made for your location</span></div>
            <div className="planner-stats"><StatCard icon={Sparkles} value="Made for you" label="Never one-size-fits-all" /><StatCard icon={Heart} value="Your budget" label="Your choices, always" /></div>
            <div className="decorative-orb orb-large" /><div className="decorative-orb orb-small" />
          </div>
          <div className="planner-card">
            <div className="form-card-header"><span className="form-card-icon"><PartyPopper size={19} /></span><div><h3>Let’s plan something lovely</h3><p>A few details, then the fun part.</p></div><span className="step-pill">STEP 1 OF 1</span></div>
            <PlannerForm onSubmit={createPlan} loading={loading} />
            {error && <div className="error-message" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={17} /></button></div>}
          </div>
        </section>

        {loading && <section className="loading-state" aria-live="polite"><span className="loading-orb"><Sparkles size={25} /></span><h2>Gathering the good ideas...</h2><p>Finding the right details for your kind of celebration.</p><div className="loading-progress"><span /></div></section>}
        {plan && request && <PlanResults plan={plan} request={request} onStartOver={startOver} />}

        <section className="closing-section">
          <span className="closing-flower"><Flower2 size={22} /></span><p>Because the best days deserve a little extra thought.</p><a href="#planner">Let’s get planning <ArrowRight size={16} /></a>
        </section>
      </main>

      <footer className="site-footer">
        <Brand light />
        <p>Made with a little sparkle, for your big moments.</p>
        <span className="footer-copyright">© {currentYear} CelebrateAI</span>
      </footer>
      <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ChevronDown size={17} /></button>
    </div>
  )
}

export default App
