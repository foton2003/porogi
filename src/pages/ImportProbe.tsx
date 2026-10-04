import { useEffect, useState } from 'react'

function dump(label: string, payload: unknown) {
  const el = document.createElement('pre')
  el.dataset.probe = label
  el.textContent = label + ' ' + JSON.stringify(payload)
  document.body.appendChild(el)
}

export default function ImportProbe() {
  const [status, setStatus] = useState('старт')

  useEffect(() => {
    void (async () => {
      const base = (import.meta as { env?: Record<string, string> }).env?.VITE_LORK_BAAS_URL
      const key = (import.meta as { env?: Record<string, string> }).env?.VITE_LORK_ANON_KEY
      dump('env', { hasBase: Boolean(base), hasKey: Boolean(key) })
      if (!base || !key) return setStatus('no env')
      try {
        const res = await fetch(base + '/rest/v1/orders_public?select=id&limit=1', {
          headers: { apikey: key, authorization: 'Bearer ' + key },
        })
        dump('res', { status: res.status, text: (await res.text()).slice(0, 500) })
        setStatus('res ' + res.status)
      } catch (e) {
        dump('catch', String(e))
        setStatus('catch')
      }
    })()
  }, [])

  return <div className="p-6"><div data-probe-status>{status}</div></div>
}
