import { useEffect } from 'react'

// Client-side navigation must load the actual static XML document.
export default function MarketFeed() {
  useEffect(() => { window.location.replace('/uploads/yandex.xml') }, [])
  return null
}
