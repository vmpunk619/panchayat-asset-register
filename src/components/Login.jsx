import { useEffect, useState } from 'react'
import { login, createUser, hasAdmin } from '../lib/auth.js'
import Wallpaper from './Wallpaper.jsx'

// Shown when nobody is logged in. On a fresh install (no admin yet) it switches
// to a one-time "create administrator" setup; afterwards it's a login form.
export default function Login({ onAuthed }) {
  const [needsSetup, setNeedsSetup] = useState(null) // null = still checking
  const [connError, setConnError] = useState(false)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function checkServer() {
    setConnError(false)
    setNeedsSetup(null)
    hasAdmin()
      .then((h) => setNeedsSetup(!h))
      .catch(() => setConnError(true))
  }
  useEffect(() => { checkServer() }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (needsSetup) {
        if (password !== confirm) throw new Error('Passwords do not match')
        await createUser({ username, password, role: 'admin', name })
        const user = await login(username, password)
        onAuthed(user)
      } else {
        const user = await login(username, password)
        onAuthed(user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const brand = (
    <div className="login-brand">
      <div className="login-logo">🏛️</div>
      <div>
        <h1>Panchayat Asset Register</h1>
        <div className="muted">Howrah District</div>
      </div>
    </div>
  )

  if (needsSetup === null) {
    return (
      <div className="login-screen">
        <Wallpaper />
        <div className="login-card">
          {brand}
          {connError ? (
            <>
              <div className="error-text" style={{ fontSize: 13 }}>
                Could not reach the server. Check your internet connection and
                Supabase configuration.
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={checkServer}>
                Retry
              </button>
            </>
          ) : (
            <div className="muted"><span className="spinner" /> Connecting to the server…</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <Wallpaper />
      <form className="login-card" onSubmit={submit}>
        {brand}

        {needsSetup ? (
          <>
            <h2>Create administrator account</h2>
            <p className="muted" style={{ marginTop: -4 }}>
              First-time setup. This account manages all other logins.
            </p>
            <div className="field">
              <label htmlFor="setup-name">Full name</label>
              <input id="setup-name" name="name" type="text" autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. District Administrator" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="setup-username">Username</label>
              <input id="setup-username" name="username" type="text" autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div className="field">
              <label htmlFor="setup-password">Password</label>
              <input id="setup-password" name="new-password" type="password" autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="setup-confirm">Confirm password</label>
              <input id="setup-confirm" name="confirm-password" type="password" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <h2>Sign in</h2>
            <div className="field">
              <label htmlFor="login-username">Username</label>
              <input id="login-username" name="username" type="text" autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="pw-wrap">
                <input id="login-password" name="password" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="pw-toggle" tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw((s) => !s)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </>
        )}

        {error && <div key={error} className="error-text shake" style={{ marginTop: 4 }}>{error}</div>}

        <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: 12 }}>
          {busy ? <><span className="spinner light" /> Please wait…</> : needsSetup ? 'Create account & continue' : 'Sign in'}
        </button>

        <div className="hint" style={{ marginTop: 14 }}>
          Accounts are created by the administrator. Data is stored securely in
          the district's shared register.
        </div>
      </form>
    </div>
  )
}
