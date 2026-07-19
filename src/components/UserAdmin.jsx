import { useEffect, useState } from 'react'
import { BLOCK_NAMES } from '../data/howrah.js'
import { ROLES, roleLabel, listUsers, createUser, deleteUser, resetPassword } from '../lib/auth.js'
import { alertDialog, confirmDialog, promptDialog } from '../lib/dialogs.jsx'

const BLANK = { name: '', username: '', password: '', role: 'gp', block: '', gp: '' }

export default function UserAdmin({ currentUser }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => setUsers(await listUsers())
  useEffect(() => { reload() }, [])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const role = ROLES.find((r) => r.key === form.role)
  const needsBlock = role?.scope === 'block' || role?.scope === 'gp'
  const needsGP = role?.scope === 'gp'

  async function add(e) {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)
    try {
      const u = await createUser(form)
      setOk(`Created “${u.username}” (${roleLabel(u.role)})`)
      setForm(BLANK)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(u) {
    const ok = await confirmDialog({
      title: 'Delete user', danger: true, okLabel: 'Delete',
      message: `Delete user “${u.username}”? They will no longer be able to sign in.`,
    })
    if (!ok) return
    try {
      await deleteUser(u.id)
      reload()
    } catch (err) {
      alertDialog({ title: 'Could not delete user', message: err.message })
    }
  }

  async function changePassword(u) {
    const pw = await promptDialog({
      title: 'Reset password', inputType: 'text', okLabel: 'Update',
      message: `New password for “${u.username}” (min 4 characters):`,
    })
    if (pw == null) return
    if (pw.length < 4) { alertDialog({ message: 'Password must be at least 4 characters.' }); return }
    try {
      await resetPassword(u.id, pw)
      alertDialog({ title: 'Done', message: `Password updated for “${u.username}”.` })
    } catch (err) {
      alertDialog({ title: 'Could not update password', message: err.message })
    }
  }

  function jurisdictionText(u) {
    if (u.role === 'gp') return `${u.block} › ${u.gp}`
    if (u.role === 'samiti') return u.block
    return 'Entire district'
  }

  return (
    <div className="dash">
      <div className="grid2">
        <div className="panel">
          <h3>Create user account</h3>
          <form onSubmit={add}>
            <div className="field"><label>Full name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Salap GP Operator" />
            </div>
            <div className="row2">
              <div className="field"><label>Username</label>
                <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="salap.gp" />
              </div>
              <div className="field"><label>Password</label>
                <input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="min 4 chars" />
              </div>
            </div>
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
              <div className="hint">{role?.desc}</div>
            </div>
            {needsBlock && (
              <div className="row2">
                <div className="field"><label>Block / Panchayat Samiti</label>
                  <select value={form.block} onChange={(e) => set('block', e.target.value)}>
                    <option value="">— select —</option>
                    {BLOCK_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {needsGP && (
                  <div className="field"><label>Gram Panchayat</label>
                    <input value={form.gp} onChange={(e) => set('gp', e.target.value)} placeholder="GP name" />
                  </div>
                )}
              </div>
            )}
            {error && <div className="error-text">{error}</div>}
            {ok && <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{ok}</div>}
            <button className="btn-primary" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </div>

        <div className="panel">
          <h3>User accounts ({users.length})</h3>
          <table className="assets" style={{ boxShadow: 'none' }}>
            <thead>
              <tr><th>User</th><th>Role</th><th>Jurisdiction</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b><br />
                    <span className="muted">@{u.username}{u.id === currentUser.id ? ' (you)' : ''}</span>
                  </td>
                  <td>{roleLabel(u.role)}</td>
                  <td>{jurisdictionText(u)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn sm" onClick={() => changePassword(u)}>Password</button>{' '}
                    <button className="btn sm danger" onClick={() => remove(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
