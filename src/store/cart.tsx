import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { archDirectionLabel, archDirectionTitle, cartTotal, describeLine, needsArchDirection, type CartLine } from '@/data/catalog'

const STORAGE_KEY = 'sill-arch-cart-v1'
const LAST_ORDER_KEY = 'sill-arch-cart-v1-last-order'
const LAST_ORDER_ONCE_KEY = 'sill-arch-cart-v1-last-order-once'

export interface OrderItemView {
  partId: string
  title: string
  sku: string
  material: string
  kit: string
  /** Направление («Передняя»/«Задняя») для арок с двумя позициями; иначе null. */
  direction: string | null
  qty: number
  unitPrice: number
  sum: number
}

export interface OrderView {
  orderNumber: string
  customerName: string
  phone: string
  city: string
  comment: string | null
  items: OrderItemView[]
  total: number
  createdAt: string
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  lastOrder: OrderView | null
  freshOrderId: string | null
  addLine: (line: CartLine) => void
  updateQty: (index: number, qty: number) => void
  removeLine: (index: number) => void
  clear: () => void
  saveOrder: (order: OrderView) => void
  consumeFreshOrder: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const line = value as CartLine
  return (
    typeof line.partId === 'string' &&
    typeof line.materialId === 'string' &&
    typeof line.kitId === 'string' &&
    (line.directionId === undefined ||
      (typeof line.directionId === 'string' &&
        (line.directionId === 'front' || line.directionId === 'rear'))) &&
    typeof line.qty === 'number' &&
    Number.isFinite(line.qty) &&
    line.qty >= 1
  )
}

function isOrderView(value: unknown): value is OrderView {
  if (typeof value !== 'object' || value === null) return false
  const order = value as OrderView
  return (
    typeof order.orderNumber === 'string' &&
    typeof order.customerName === 'string' &&
    typeof order.phone === 'string' &&
    typeof order.city === 'string' &&
    typeof order.total === 'number' &&
    Array.isArray(order.items)
  )
}

function readStored<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage may be unavailable — state still works for the session
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() =>
    readStored<CartLine[]>(
      STORAGE_KEY,
      (value): value is CartLine[] => Array.isArray(value),
      [],
    ).filter(isCartLine),
  )
  const [lastOrder, setLastOrder] = useState<OrderView | null>(() =>
    readStored<OrderView | null>(
      LAST_ORDER_KEY,
      (value): value is OrderView | null => value === null || isOrderView(value),
      null,
    ),
  )
  const [freshOrderId, setFreshOrderId] = useState<string | null>(() =>
    readStored<string | null>(LAST_ORDER_ONCE_KEY, (value): value is string | null => value === null || typeof value === 'string', null),
  )

  const addLine = useCallback((line: CartLine) => {
    setLines((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.partId === line.partId &&
          item.materialId === line.materialId &&
          item.kitId === line.kitId &&
          (item.directionId ?? '') === (line.directionId ?? ''),
      )
      const next =
        index === -1
          ? [...prev, line]
          : prev.map((item, i) => (i === index ? { ...item, qty: item.qty + line.qty } : item))
      write(STORAGE_KEY, next)
      return next
    })
  }, [])

  const updateQty = useCallback((index: number, qty: number) => {
    setLines((prev) => {
      if (qty < 1 || !prev[index]) return prev
      const next = prev.map((item, i) => (i === index ? { ...item, qty } : item))
      write(STORAGE_KEY, next)
      return next
    })
  }, [])

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index)
      write(STORAGE_KEY, next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setLines([])
    write(STORAGE_KEY, [])
  }, [])

  const saveOrder = useCallback((order: OrderView) => {
    setLastOrder(order)
    write(LAST_ORDER_KEY, order)
    setFreshOrderId(order.orderNumber)
    write(LAST_ORDER_ONCE_KEY, order.orderNumber)
  }, [])

  const consumeFreshOrder = useCallback(() => {
    setFreshOrderId(null)
    write(LAST_ORDER_ONCE_KEY, null)
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      lastOrder,
      freshOrderId,
      addLine,
      updateQty,
      removeLine,
      clear,
      saveOrder,
      consumeFreshOrder,
    }),
    [lines, lastOrder, freshOrderId, addLine, updateQty, removeLine, clear, saveOrder, consumeFreshOrder],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export function encodeOrderNumber(orderNumber: string): string {
  if (typeof window === 'undefined') return orderNumber
  return window.btoa(orderNumber)
}

export function decodeOrderNumber(encoded: string | undefined): string | null {
  if (!encoded) return null
  try {
    return window.atob(encoded)
  } catch {
    return null
  }
}

export function orderItemsFromLines(lines: CartLine[]): OrderItemView[] {
  return lines.flatMap((line) => {
    const described = describeLine(line)
    if (!described) return []
    return [
      {
        partId: described.part.id,
        title: archDirectionTitle(described.part, line.directionId),
        sku: described.part.sku,
        material: described.material.label,
        kit: described.kit.label,
        direction: needsArchDirection(described.part)
          ? archDirectionLabel(line.directionId)
          : null,
        qty: line.qty,
        unitPrice: described.unitPrice,
        sum: described.sum,
      },
    ]
  })
}

export function orderTotalFromLines(lines: CartLine[]): number {
  return cartTotal(lines)
}
