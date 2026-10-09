import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CartProvider, useCart } from '@/store/cart'

const links = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/contacts', label: 'Контакты' },
]

const COOKIE_ACCEPT_KEY = 'sill-arch-cookie-accepted-v1'

function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return window.localStorage.getItem(COOKIE_ACCEPT_KEY) !== '1'
    } catch {
      return true
    }
  })

  if (!visible) return null

  const accept = () => {
    try {
      window.localStorage.setItem(COOKIE_ACCEPT_KEY, '1')
    } catch {
      // localStorage недоступен — баннер просто закроется до перезагрузки
    }
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label="Уведомление о файлах cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">Сайт использует файлы Cookies</p>
        <button
          type="button"
          onClick={accept}
          className="ml-auto inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Принять
        </button>
      </div>
    </div>
  )
}

function CartBadge() {
  const { count } = useCart()
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
        count > 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
      }`}
      aria-label={`Товаров в корзине: ${count}`}
    >
      {count}
    </span>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <CartProvider>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
              <img src="data:image/png;base64,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" alt="Логотип ПорогиПро" className="h-12 w-12 rounded-lg object-contain" aria-hidden="true" style={{ width: "auto", height: 48 }} />
              <span className="leading-tight">
                Пороги<span className="text-accent">Про</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  пороги и арки для иномарки
                </span>
              </span>
            </Link>

            <a
              href="tel:+78003501624"
              className="inline-flex min-h-11 items-center whitespace-nowrap px-1 text-sm font-bold transition-colors hover:text-accent sm:text-base"
            >
              +7 (800) 350-16-24
            </a>

            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-secondary font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto hidden items-center gap-3 sm:flex">
              <Link
                to="/cart"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Корзина
                <CartBadge />
              </Link>
            </div>
          </div>

          <nav className="flex items-center justify-between gap-1 border-t border-border px-4 py-2 sm:hidden">
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm ${
                      isActive ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <Link
              to="/cart"
              aria-label="Перейти в корзину"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <CartBadge />
            </Link>
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <CookieBanner />

        <footer className="mt-16 border-t border-border bg-card">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            <div>
              <div className="font-semibold">
                Пороги<span className="text-accent">Про</span>
              </div>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Новые ремонтные пороги и колёсные арки для кузовного ремонта автомобилей.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Разделы
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-accent hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/cart" className="text-accent hover:underline">
                    Корзина
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Как купить
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Выберите марку, модель и поколение в каталоге.</li>
                <li>Соберите заказ в корзине.</li>
                <li>Оформите заказ — мы свяжемся с вами для подтверждения.</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>© {new Date().getFullYear()} ПорогиПро — ремонтные пороги и арки.</span>
              <span>ИП ТРЕТЬЯКОВ АРТЕМ АНАТОЛЬЕВИЧ, ИНН 780535524910</span>
              <span>Предложение не является публичной офертой.</span>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
