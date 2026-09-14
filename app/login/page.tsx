'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react'

const DEMO_ACCOUNTS = [
  {
    roleLabel: 'Food Safety Inspector',
    email: 'inspector@looks-fine.local',
    password: 'LooksFine@123',
    badge: 'Tukaram Munde',
    region: 'Solapur',
  },
  {
    roleLabel: 'Inspection Manager',
    email: 'manager@looks-fine.local',
    password: 'LooksFine@123',
    badge: 'Sneha Deshmukh',
    region: 'Solapur',
  },
  {
    roleLabel: 'Establishment Manager',
    email: 'establishment@looks-fine.local',
    password: 'LooksFine@123',
    badge: 'Amit Kulkarni',
    region: 'Hotel Rajdhani',
  },
  {
    roleLabel: 'Administrator',
    email: 'admin@looks-fine.local',
    password: 'LooksFine@123',
    badge: 'Dr. Neha Joshi',
    region: 'Maharashtra',
  },
]

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          router.replace('/')
        }
      })
      .catch(() => {})
      .finally(() => {
        setCheckingAuth(false)
      })
  }, [router])

  const validateForm = (): boolean => {
    let valid = true;
    setEmailError(null)
    setPasswordError(null)
    setErrorMessage(null)

    if (!email.trim()) {
      setEmailError('Email address is required')
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address')
      valid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      valid = false
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Successfully authenticated & session cookie set
        router.push('/')
        router.refresh()
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Please verify your email and password.')
      }
    } catch (err: any) {
      setErrorMessage('Network connection error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickSelectDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setEmailError(null)
    setPasswordError(null)
    setErrorMessage(null)
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--paper, #f4f2ec)' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <RefreshCw style={{ width: 28, height: 28, color: 'var(--lime, #c9f34a)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Verifying session...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="login-shell" style={{ minHeight: '100vh', display: 'flex', background: 'var(--paper, #f4f2ec)', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', width: '100%', minHeight: '100vh' }} className="login-grid">
        
        {/* DESKTOP SPLIT CONTAINER */}
        <div className="login-split-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
          
          {/* LEFT SIDE: BRAND & VISUAL SHOWCASE */}
          <section
            className="login-brand-section"
            style={{
              flex: '1.1',
              background: 'var(--ink, #101314)',
              color: 'white',
              padding: '48px 56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Ambient Background Accents */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,243,74,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,120,107,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Top Brand Header */}
            <div style={{ zIndex: 1 }}>
              <div className="brand" style={{ padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/looks-fine-logo.png" alt="LooksFine Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
                <span style={{ color: 'white' }}>looks<span style={{ color: 'var(--lime, #c9f34a)' }}>fine</span></span>
              </div>
              <p className="eyebrow" style={{ marginTop: '16px', color: '#88918a', letterSpacing: '1.2px' }}>
                AI-Powered Food Safety Intelligence Platform
              </p>
            </div>

            {/* Middle Feature Showcase Card */}
            <div style={{ zIndex: 1, margin: '40px 0' }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '38px', lineHeight: '1.15', fontWeight: 500, letterSpacing: '-1.5px', margin: '0 0 16px 0', color: '#ffffff' }}>
                Predictive Risk &amp; Inspection Command Center<span style={{ color: 'var(--coral, #ff786b)' }}>.</span>
              </h1>
              <p style={{ fontSize: '14px', color: '#a0a89d', lineHeight: '1.5', margin: '0 0 28px 0', maxWidth: '460px' }}>
                Transforming public health inspection workflows with machine learning risk scoring, multimodal visual evidence scanning, and grounded AI decision support.
              </p>

              {/* Value Points Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#171d1b', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283330' }}>
                  <div style={{ background: 'rgba(201,243,74,0.15)', color: 'var(--lime, #c9f34a)', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
                    <Sparkles style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>Predictive Risk Prioritization</b>
                    <span style={{ fontSize: '11px', color: '#9da69a', marginTop: '2px', display: 'block' }}>
                      Gradient boosting models predict P(serious violation) to guide inspector allocation before risks escalate.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#171d1b', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283330' }}>
                  <div style={{ background: 'rgba(169,219,228,0.15)', color: 'var(--blue, #a9dbe4)', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
                    <ShieldCheck style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>Evidence-Backed Inspections</b>
                    <span style={{ fontSize: '11px', color: '#9da69a', marginTop: '2px', display: 'block' }}>
                      Gemini Vision scanner flags kitchen defects and generates verifiable audit-ready violation records.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#171d1b', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283330' }}>
                  <div style={{ background: 'rgba(255,120,107,0.15)', color: 'var(--coral, #ff786b)', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
                    <Bot style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>Grounded Ollama Llama 3.1 Briefings</b>
                    <span style={{ fontSize: '11px', color: '#9da69a', marginTop: '2px', display: 'block' }}>
                      Local LLM reasoning provides structured pre-inspection briefs grounded strictly in PostgreSQL history.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Metadata */}
            <div style={{ zIndex: 1, display: 'flex', borderTop: '1px solid #27312e', paddingTop: '20px', color: '#7a827b', fontSize: '11px', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Maharashtra Food Safety Authority</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--lime, #c9f34a)', fontWeight: 600 }}>
                <i className="status-dot" style={{ background: '#84b23b' }} /> System Operational
              </span>
            </div>
          </section>

          {/* RIGHT SIDE: LOGIN FORM CARD */}
          <section
            className="login-form-section"
            style={{
              flex: '0.9',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px 32px',
              background: 'var(--paper, #f4f2ec)',
            }}
          >
            <div style={{ width: '100%', maxWidth: '420px' }}>
              
              {/* Form Header */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 500, letterSpacing: '-1px', margin: '0 0 8px 0', color: 'var(--ink, #101314)' }}>
                  Sign in to your account
                </h2>
                <p style={{ fontSize: '13px', color: '#666963', margin: 0 }}>
                  Enter your credentials to access the inspection command center.
                </p>
              </div>

              {/* Server Error Alert Banner */}
              {errorMessage && (
                <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }} role="alert">
                  <AlertCircle style={{ width: 16, height: 16, color: '#d32f2f', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: '#c62828', lineHeight: '1.4', fontWeight: 500 }}>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate>
                
                {/* Email Field */}
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#444743', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888b85', display: 'flex', alignItems: 'center' }}>
                      <Mail style={{ width: 16, height: 16 }} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (emailError) setEmailError(null)
                      }}
                      placeholder="inspector@looks-fine.local"
                      autoComplete="email"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 38px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: emailError ? '1px solid #e54d42' : '1px solid var(--line, #d9d8d1)',
                        background: 'var(--white, #fffefa)',
                        color: 'var(--ink, #101314)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  </div>
                  {emailError && (
                    <span id="email-error" style={{ fontSize: '11px', color: '#e54d42', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="password" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#444743' }}>
                      Password
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888b85', display: 'flex', alignItems: 'center' }}>
                      <Lock style={{ width: 16, height: 16 }} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (passwordError) setPasswordError(null)
                      }}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-error' : undefined}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '11px 40px 11px 38px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: passwordError ? '1px solid #e54d42' : '1px solid var(--line, #d9d8d1)',
                        background: 'var(--white, #fffefa)',
                        color: 'var(--ink, #101314)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 0,
                        padding: '4px',
                        color: '#777a74',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {passwordError && (
                    <span id="password-error" style={{ fontSize: '11px', color: '#e54d42', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                      {passwordError}
                    </span>
                  )}
                </div>

                {/* Remember Me Option */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#555852', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: 'var(--ink, #101314)' }}
                    />
                    <span>Remember this session (7 days)</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="dark-button"
                  style={{
                    width: '100%',
                    padding: '13px',
                    fontSize: '12px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16,19,20,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to Dashboard</span>
                      <ArrowRight style={{ width: 15, height: 15 }} />
                    </>
                  )}
                </button>
              </form>

              {/* ACCOUNT QUICK SELECTION BAR */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--line, #d9d8d1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777a74' }}>
                    Select Account Role:
                  </span>
                  <span style={{ fontSize: '10px', color: '#888b84' }}>Password: LooksFine@123</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickSelectDemo(acc)}
                      style={{
                        background: email === acc.email ? '#eaf5b8' : 'var(--white, #fffefa)',
                        border: email === acc.email ? '1px solid #799423' : '1px solid var(--line, #d9d8d1)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink, #101314)' }}>
                        {acc.roleLabel}
                      </div>
                      <div style={{ fontSize: '10px', color: '#777a74', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.badge} ({acc.region})
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </main>
  )
}
