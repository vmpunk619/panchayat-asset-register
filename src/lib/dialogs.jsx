import { useEffect, useRef, useState } from 'react'

// Promise-based in-app dialogs that replace window.alert / confirm / prompt.
// Mount <DialogHost /> once (App root); call the helpers from anywhere:
//   await alertDialog('Saved.')
//   const ok = await confirmDialog({ title: 'Delete', message: '…', danger: true })
//   const value = await promptDialog({ message: 'New password:' })  // null = cancelled

let open = null
const norm = (o) => (typeof o === 'string' ? { message: o } : o || {})

export function alertDialog(opts) { return open({ type: 'alert', ...norm(opts) }) }
export function confirmDialog(opts) { return open({ type: 'confirm', ...norm(opts) }) }
export function promptDialog(opts) { return open({ type: 'prompt', ...norm(opts) }) }

export function DialogHost() {
  const [dlg, setDlg] = useState(null)
  const [value, setValue] = useState('')
  const resolver = useRef(null)

  open = (opts) =>
    new Promise((resolve) => {
      resolver.current = resolve
      setValue(opts.defaultValue || '')
      setDlg(opts)
    })

  function close(result) {
    resolver.current?.(result)
    resolver.current = null
    setDlg(null)
  }
  const cancelValue = dlg?.type === 'prompt' ? null : dlg?.type === 'confirm' ? false : undefined
  const okValue = () => (dlg.type === 'prompt' ? value : dlg.type === 'confirm' ? true : undefined)

  useEffect(() => {
    if (!dlg) return
    const onKey = (e) => {
      if (e.key === 'Escape') close(cancelValue)
      if (e.key === 'Enter' && dlg.type !== 'prompt') close(okValue())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlg, value])

  if (!dlg) return null

  const title = dlg.title || (dlg.type === 'confirm' ? 'Please confirm' : dlg.type === 'prompt' ? 'Input needed' : 'Notice')

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(cancelValue)}>
      <div className="modal dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2></header>
        <div className="content">
          <p style={{ margin: 0, lineHeight: 1.55 }}>{dlg.message}</p>
          {dlg.type === 'prompt' && (
            <input
              autoFocus
              type={dlg.inputType || 'text'}
              value={value}
              placeholder={dlg.placeholder || ''}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') close(value) }}
              style={{ marginTop: 12 }}
            />
          )}
        </div>
        <footer>
          {dlg.type !== 'alert' && (
            <button className="btn-outline" onClick={() => close(cancelValue)}>
              {dlg.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            className={'btn-primary' + (dlg.danger ? ' danger' : '')}
            autoFocus={dlg.type !== 'prompt'}
            onClick={() => close(okValue())}
          >
            {dlg.okLabel || 'OK'}
          </button>
        </footer>
      </div>
    </div>
  )
}
