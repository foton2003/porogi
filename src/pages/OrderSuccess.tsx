import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { formatPrice } from '@/data/catalog'
import { decodeOrderNumber, useCart } from '@/store/cart'

function SuccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Заказ оформлен</h1>
        {children}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/catalog"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Вернуться в каталог
          </Link>
          <Link
            to="/"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccess() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { lastOrder, freshOrderId, consumeFreshOrder } = useCart()
  const [consumed, setConsumed] = useState(false)

  const decodedNumber = decodeOrderNumber(orderNumber)
  const state = location.state as { orderNumber?: string } | null
  const matchesRoute =
    lastOrder !== null &&
    decodedNumber !== null &&
    lastOrder.orderNumber === decodedNumber &&
    (state === null || state.orderNumber === undefined || state.orderNumber === decodedNumber)
  const isFresh = matchesRoute && freshOrderId === decodedNumber

  useEffect(() => {
    if (isFresh && !consumed) {
      setConsumed(true)
      consumeFreshOrder()
    }
  }, [isFresh, consumed, consumeFreshOrder])

  const order = matchesRoute ? lastOrder : null

  if (!order) {
    return (
      <SuccessLayout>
        <p className="mt-2 text-muted-foreground">
          Номер вашего заказа:{' '}
          <span className="font-semibold text-accent">{decodedNumber ?? '—'}</span>
        </p>
        <div className="mt-4 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Состав заказа был показан после подтверждения. Сохраните номер заказа — он понадобится
          при обращении.
        </div>
      </SuccessLayout>
    )
  }

  return (
    <SuccessLayout>
      <div className="mt-5 rounded-md border border-accent/40 bg-secondary px-4 py-3 text-sm font-medium">
        Спасибр за заказ! Сейчас с вами свяжется менеджер для уточнения деталей заказа, примите
        звонок!📞
      </div>

      <p className="mt-4 text-muted-foreground">
        Спасибо! Мы получили ваш заказ и свяжемся с вами, чтобы подтвердить состав и детали
        получения.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-secondary px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Номер заказа</div>
          <div className="text-lg font-bold text-accent">{order.orderNumber}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Сумма</div>
          <div className="text-lg font-bold">{formatPrice(order.total)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Дата</div>
          <div className="text-lg font-bold">
            {new Date(order.createdAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Состав заказа</h2>
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {order.items.map((item) => (
            <li key={`${item.partId}-${item.material}-${item.kit}`} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Арт. {item.sku} · {item.material} · {item.kit}
                    {item.direction ? ` · Направление: ${item.direction}` : ''} · {item.qty} шт.
                  </div>
                </div>
                <div className="text-sm font-semibold text-accent">{formatPrice(item.sum)}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Итоговая сумма</span>
          <span className="text-2xl font-bold text-accent">{formatPrice(order.total)}</span>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Имя</dt>
          <dd className="font-medium">{order.customerName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Телефон</dt>
          <dd className="font-medium">{order.phone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Город</dt>
          <dd className="font-medium">{order.city}</dd>
        </div>
        {order.comment && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Комментарий</dt>
            <dd className="font-medium">{order.comment}</dd>
          </div>
        )}
      </dl>
    </SuccessLayout>
  )
}
