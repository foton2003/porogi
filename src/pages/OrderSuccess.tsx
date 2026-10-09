import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { db } from '@lork/sdk'
import { markPhoneClick } from '@/lib/callbackScript'
import { formatPrice } from '@/data/catalog'
import { decodeOrderNumber, useCart } from '@/store/cart'

type LastInsert = {
  id: string
  order_number: string | null
  customer_name: string | null
  phone: string | null
  city: string | null
  comment: string | null
  items: unknown
  total: number | string | null
  status: string | null
  created_at: string | null
}

type FallbackItem = {
  partId: string
  title: string
  sku: string
  material: string
  kit: string
  direction: string | null
  qty: number
  unitPrice: number
  sum: number
}

function normalizePhone(value: string | null): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`
  }
  if (digits.length === 10) return `+7${digits}`
  return value
}

function itemView(item: unknown): FallbackItem | null {
  if (typeof item !== 'object' || item === null) return null
  const value = item as Record<string, unknown>
  const qty = typeof value.qty === 'number' ? value.qty : 1
  const unitPrice = typeof value.unitPrice === 'number' ? value.unitPrice : 0
  const sum = typeof value.sum === 'number' ? value.sum : unitPrice * qty
  return {
    partId: typeof value.partId === 'string' ? value.partId : '',
    title: typeof value.title === 'string' ? value.title : '',
    sku: typeof value.sku === 'string' ? value.sku : '',
    material: typeof value.material === 'string' ? value.material : '',
    kit: typeof value.kit === 'string' ? value.kit : '',
    direction: typeof value.direction === 'string' ? value.direction : null,
    qty,
    unitPrice,
    sum,
  }
}

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
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Спасибо за заказ!</h1>
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
  /* Отметка клика по телефону — скрипт обратного звонка больше не срабатывает. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null
      if (target) markPhoneClick()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
  const { orderNumber } = useParams()
  const location = useLocation()
  const { lastOrder, freshOrderId, consumeFreshOrder } = useCart()
  const [consumed, setConsumed] = useState(false)
  const [remote, setRemote] = useState<LastInsert | null>(null)
  const [failed, setFailed] = useState(false)

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

  /* Запасной путь: если локальное состояние заказа недоступно (новая вкладка,
     очистка localStorage, приватный режим), заказ читается из orders_public по
     номеру — /thankyou/<номер> работает и после перезагрузки страницы. */
  useEffect(() => {
    if (order || !decodedNumber) return
    let cancelled = false
    setFailed(false)
    void (async () => {
      try {
        const { data, error } = await db
          .from('orders_public')
          .select('*')
          .eq('order_number', decodedNumber)
          .order('created_at', { ascending: false })
          .limit(1)
        if (error) throw error
        const row = Array.isArray(data) ? (data[0] as LastInsert | undefined) : undefined
        if (cancelled) return
        if (row) setRemote(row)
        else setFailed(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [order, decodedNumber])

  const fallbackItems: FallbackItem[] = Array.isArray(remote?.items)
    ? (remote?.items as unknown[]).map(itemView).filter((item): item is FallbackItem => item !== null)
    : []

  if (remote) {
    return (
      <SuccessLayout>
        <div className="mt-5 rounded-md border border-accent/40 bg-secondary px-4 py-3 text-sm font-medium">
          Ожидайте звонка менеджера для подтверждения заказа
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Остались вопросы или хотите уточнить информацию по заказу самостоятельно, звоните
          </p>
          <a
            href="tel:+78003501624"
            className="mt-1 inline-flex min-h-11 items-center text-lg font-bold text-accent transition-colors hover:text-accent/80"
          >
            +7 (800) 350-16-24
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-secondary px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Номер заказа</div>
            <div className="text-lg font-bold text-accent">{remote.order_number}</div>
          </div>
          {remote.total !== null ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Сумма</div>
              <div className="text-lg font-bold">{formatPrice(Number(remote.total))}</div>
            </div>
          ) : null}
          {remote.created_at ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Дата</div>
              <div className="text-lg font-bold">
                {new Date(remote.created_at).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ) : null}
        </div>

        {fallbackItems.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold">Заказанные товары</h2>
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {fallbackItems.map((item, index) => (
                <li key={`${item.partId || 'item'}-${index}`} className="p-3">
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
              <span className="text-2xl font-bold text-accent">
                {formatPrice(Number(remote.total) || 0)}
              </span>
            </div>
          </div>
        )}

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Имя</dt>
            <dd className="font-medium">{remote.customer_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Телефон</dt>
            <dd className="font-medium">{normalizePhone(remote.phone)}</dd>
          </div>
          {remote.city ? (
            <div>
              <dt className="text-muted-foreground">Город</dt>
              <dd className="font-medium">{remote.city}</dd>
            </div>
          ) : null}
          {remote.comment ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Комментарий</dt>
              <dd className="font-medium">{remote.comment}</dd>
            </div>
          ) : null}
        </dl>
      </SuccessLayout>
    )
  }

  if (!order) {
    if (!decodedNumber) {
      return (
        <SuccessLayout>
          <p className="mt-2 text-muted-foreground">
            Номер заказа в адресе страницы некорректен. Сохраните номер заказа — он понадобится при
            обращении.
          </p>
        </SuccessLayout>
      )
    }
    if (failed) {
      return (
        <SuccessLayout>
          <p className="mt-2 text-muted-foreground">
            Номер вашего заказа:{' '}
            <span className="font-semibold text-accent">{decodedNumber}</span>
          </p>
          <div className="mt-4 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Подробности заказа временно недоступны — сохраните номер заказа, он понадобится при
            обращении.
          </div>
          <div className="mt-5 rounded-md border border-accent/40 bg-secondary px-4 py-3 text-sm font-medium">
            Ожидайте звонка менеджера для подтверждения заказа
          </div>
        </SuccessLayout>
      )
    }
    return (
      <SuccessLayout>
        <p className="mt-2 text-muted-foreground">Загружаем данные заказа…</p>
      </SuccessLayout>
    )
  }

  return (
    <SuccessLayout>
      <div className="mt-5 rounded-md border border-accent/40 bg-secondary px-4 py-3 text-sm font-medium">
        Ожидайте звонка менеджера для подтверждения заказа
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          Остались вопросы или хотите уточнить информацию по заказу самостоятельно, звоните
        </p>
        <a
          href="tel:+78003501624"
          className="mt-1 inline-flex min-h-11 items-center text-lg font-bold text-accent transition-colors hover:text-accent/80"
        >
          +7 (800) 350-16-24
        </a>
      </div>

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
        <h2 className="font-semibold">Заказанные товары</h2>
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
        {order.city && (
          <div>
            <dt className="text-muted-foreground">Город</dt>
            <dd className="font-medium">{order.city}</dd>
          </div>
        )}
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
