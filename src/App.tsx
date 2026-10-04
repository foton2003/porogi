import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { CartProvider, useCart } from '@/store/cart'

const links = [
  { to: '/catalog', label: 'Каталог' },
]

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
              <img
                src="https://yaart-web-alice-images.s3.yandex.net/e8fdc03abf1c11f1a777520d3b9467fa:1"
                alt="Логотип ПорогиПро"
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-contain"
              />
              <span className="leading-tight">
                Пороги<span className="text-accent">Про</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  пороги и арки для иномарки
                </span>
              </span>
            </Link>

            <a
              href="tel:+78003025024"
              className="inline-flex min-h-11 items-center whitespace-nowrap px-1 text-sm font-bold transition-colors hover:text-accent sm:text-base"
            >
              +7 (800) 302-50-24
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
              <span>Предложение не является публичной офертой.</span>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
