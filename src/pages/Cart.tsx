import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { cartTotal, describeLine, formatPrice, needsArchDirection, archDirectionLabel, archDirectionTitle } from '@/data/catalog'
import { useCart } from '@/store/cart'

export default function Cart() {
  const { lines, removeLine } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const total = cartTotal(lines)
  const items = lines.map((line, index) => ({ line, index, described: describeLine(line) }))
  const validItems = items.filter((item) => item.described !== null)

  if (lines.length === 0) {
    return <Navigate to="/catalog" replace />
  }

  const handleCheckout = () => {
    if (validItems.length === 0) {
      setError('В корзине нет доступных товаров.')
      return
    }
    if (validItems.length !== items.length) {
      setError('Часть товаров недоступна — удалите их и продолжите оформление.')
      return
    }
    setError('')
    navigate('/checkout')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Корзина</h1>
          <p className="mt-2 text-muted-foreground">Состав заказа и итоговая сумма.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map(({ line, index, described }) => {
            if (!described) {
              return (
                <div
                  key={`${line.partId}-${line.materialId}-${line.kitId}-${line.directionId ?? ''}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-card p-4"
                >
                  <span className="text-sm text-destructive">Товар недоступен</span>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="inline-flex min-h-11 items-center px-1 text-sm underline-offset-4 hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              )
            }

            const { part, material, kit, sum } = described
            const showDirection = needsArchDirection(part)
            const lineKey = `${line.partId}-${line.materialId}-${line.kitId}-${line.directionId ?? ''}`
            return (
              <div
                key={lineKey}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row"
              >
                <Link to={`/product/${part.id}`} className="shrink-0">
                  <img
                    src={part.images[0]}
                    alt={part.title}
                    className="h-24 w-full rounded-md object-cover sm:h-24 sm:w-32"
                    loading="lazy"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/product/${part.id}`} className="font-semibold hover:text-accent">
                        {archDirectionTitle(part, line.directionId)}
                      </Link>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {part.vehicle.brand} {part.vehicle.model} · {part.vehicle.generation}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {material.label} · {kit.label}
                        {showDirection ? ` · Направление: ${archDirectionLabel(line.directionId)}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-accent">{formatPrice(sum)}</div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Итог заказа</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Товаров в корзине</dt>
              <dd className="font-medium">{lines.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Общее количество</dt>
              <dd className="font-medium">{lines.reduce((sum, line) => sum + line.qty, 0)} шт.</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="text-muted-foreground">Доставка</dt>
              <dd className="font-medium">обсуждается при подтверждении</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Итоговая сумма</span>
            <span className="text-2xl font-bold text-accent">{formatPrice(total)}</span>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-secondary px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            className="mt-4 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Оформить заказ
          </button>

          <Link
            to="/catalog"
            className="mt-3 flex min-h-11 items-center justify-center text-center text-sm text-accent underline-offset-4 hover:underline"
          >
            Продолжить покупки
          </Link>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Оплата при оформлении не производится: после отправки заказа мы свяжемся с вами и
            согласуем детали.
          </p>
        </aside>
      </div>
    </div>
  )
}
