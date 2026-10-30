import { auth, db, storage } from '@lork/sdk'

export type Role = 'admin' | 'editor'
export type Profile = { id: string; userId: string; email: string; displayName: string; role: Role }
export type Article = { id: string; title: string; body: string; status: 'draft' | 'published'; imageUrl: string | null; createdAt: string }
export type Order = { id: string; orderNumber: string; customerName: string; phone: string; city: string; comment: string | null; items: unknown; total: number; status: string; createdAt: string }

/** Деталь каталога с админ-правками (фото, характеристики, описание). */
export type ProductEdit = {
  id: string
  brand: string
  model: string
  generation: string | null
  years: string | null
  body: string | null
  parts: unknown
  imageUrls: string[]
  specs: SpecRow[]
  description: string
  isEdited: boolean
}
export type SpecRow = { name: string; value: string }

export const can = (role: Role | undefined, action: 'manage_users' | 'manage_orders' | 'manage_articles' | 'manage_products') => {
  if (!role) return false
  if (action === 'manage_users') return role === 'admin'
  if (action === 'manage_orders') return role === 'admin'
  if (action === 'manage_products') return role === 'admin'
  return true // статьи: админ и редактор
}

type Session = { user: { id: string; email?: string } | null }

let cachedRoles: string[] | null = null
export async function currentRoles(): Promise<string[]> {
  if (cachedRoles) return cachedRoles
  try {
    cachedRoles = (await auth.getRoles?.()) ?? []
  } catch {
    cachedRoles = []
  }
  return cachedRoles
}

export async function isAdmin(): Promise<boolean> {
  return (await currentRoles()).includes('admin')
}

export async function ensureProfile(): Promise<Profile | null> {
  const roles = await currentRoles()
  const role: Role = roles.includes('admin') ? 'admin' : 'editor'
  const session: unknown = await auth.getSession?.()
  const user = (session as Session | null)?.user
  if (!user) return null
  const email = user.email ?? ''
  const { data: rows, error } = await db.from('profiles').select('*').eq('user_id', user.id)
  if (error) throw error
  let row = rows?.[0]
  if (!row) {
    const insert = await db.from('profiles').insert({ user_id: user.id, email, display_name: email.split('@')[0], role })
    if (insert.error) throw insert.error
    const again = await db.from('profiles').select('*').eq('user_id', user.id)
    row = again.data?.[0]
  }
  if (!row) return null
  return { id: row.id, userId: row.user_id, email: row.email ?? email, displayName: row.display_name ?? '', role: (row.role as Role) ?? role }
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, email: r.email ?? '', displayName: r.display_name ?? '', role: r.role as Role }))
}

export async function setProfileRole(profileId: string, role: Role) {
  const { error } = await db.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw error
}

const mapArticle = (r: any): Article => ({ id: r.id, title: r.title, body: r.body, status: r.status, imageUrl: r.image_url, createdAt: r.created_at })

export async function listArticles(opts: { status?: string; q?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? 10
  let query = db.from('articles').select('*', { count: 'exact' })
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.q) query = query.ilike('title', `%${opts.q}%`)
  const { data, error, count } = await query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw error
  return { rows: (data ?? []).map(mapArticle), total: count ?? 0 }
}

export async function getArticle(id: string): Promise<Article | null> {
  const { data, error } = await db.from('articles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapArticle(data) : null
}

export async function saveArticle(input: { id?: string; title: string; body: string; status: string; imageFile?: File | null; imageUrl?: string | null }) {
  let imageUrl = input.imageUrl ?? null
  if (input.imageFile) {
    const uploaded = await storage.upload('articles', input.imageFile)
    if ((uploaded as any).error) throw (uploaded as any).error
    imageUrl = (uploaded as any).url as string
  }
  const payload = { title: input.title, body: input.body, status: input.status, image_url: imageUrl }
  if (input.id) {
    const { error } = await db.from('articles').update(payload).eq('id', input.id)
    if (error) throw error
    return input.id
  }
  const { data, error } = await db.from('articles').insert(payload).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deleteArticle(id: string) {
  const { error } = await db.from('articles').delete().eq('id', id)
  if (error) throw error
}

const mapOrder = (r: any): Order => ({ id: r.id, orderNumber: r.order_number, customerName: r.customer_name, phone: r.phone, city: r.city, comment: r.comment, items: r.items, total: Number(r.total), status: r.status ?? 'new', createdAt: r.created_at })

export async function listOrders(opts: { status?: string; q?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? 10
  let query = db.from('orders_public').select('*', { count: 'exact' })
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.q) query = query.or(`order_number.ilike.%${opts.q}%,customer_name.ilike.%${opts.q}%,phone.ilike.%${opts.q}%`)
  const { data, error, count } = await query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw error
  return { rows: (data ?? []).map(mapOrder), total: count ?? 0 }
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await db.from('orders_public').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateOrder(id: string, patch: { status?: string; total?: number }) {
  const payload: Record<string, unknown> = {}
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.total !== undefined) payload.total = patch.total
  const { error } = await db.from('orders_public').update(payload).eq('id', id)
  if (error) throw error
}

export function ordersToCsv(rows: Order[]): string {
  const header = ['Номер', 'Дата', 'Клиент', 'Телефон', 'Город', 'Статус', 'Сумма']
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((o) => [o.orderNumber, o.createdAt, o.customerName, o.phone, o.city, o.status, o.total].map(escape).join(';'))
  return [header.map(escape).join(';'), ...lines].join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------- Редактирование товаров каталога (bot_catalog) ---------- */

function mapProduct(r: any): ProductEdit {
  let parts: unknown = r.parts
  try {
    if (typeof parts === 'string') parts = JSON.parse(parts)
  } catch {
    /* parts остаётся как есть */
  }
  let imageUrls: string[] = []
  try {
    const raw = typeof r.image_urls === 'string' ? JSON.parse(r.image_urls) : r.image_urls
    if (Array.isArray(raw)) imageUrls = raw.filter((v: unknown) => typeof v === 'string')
  } catch {
    /* фото не заданы */
  }
  let specs: SpecRow[] = []
  try {
    const raw = typeof r.specs === 'string' ? JSON.parse(r.specs) : r.specs
    if (Array.isArray(raw)) {
      specs = raw
        .filter((v: any) => v && typeof v === 'object')
        .map((v: any) => ({ name: String(v.name ?? ''), value: String(v.value ?? '') }))
        .filter((v: SpecRow) => v.name.trim() !== '' || v.value.trim() !== '')
    }
  } catch {
    /* характеристики не заданы */
  }
  return {
    id: r.id,
    brand: r.brand ?? '',
    model: r.model ?? '',
    generation: r.generation ?? null,
    years: r.years ?? null,
    body: r.body ?? null,
    parts,
    imageUrls,
    specs,
    description: typeof r.description === 'string' ? r.description : '',
    isEdited: Boolean(r.is_edited),
  }
}

export async function listProducts(opts: { q?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? 20
  let query = db.from('bot_catalog').select('*', { count: 'exact' })
  if (opts.q) query = query.or(`brand.ilike.%${opts.q}%,model.ilike.%${opts.q}%,generation.ilike.%${opts.q}%`)
  const { data, error, count } = await query
    .order('brand', { ascending: true })
    .order('model', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw error
  return { rows: (data ?? []).map(mapProduct), total: count ?? 0 }
}

export async function getProduct(id: string): Promise<ProductEdit | null> {
  const { data, error } = await db.from('bot_catalog').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapProduct(data) : null
}

/** Сохраняет правки товара: фото (новые файлы → storage), характеристики, описание. */
export async function saveProduct(input: {
  id: string
  imageUrls: string[]
  imageFiles: File[]
  specs: SpecRow[]
  description: string
}): Promise<void> {
  const uploaded: string[] = [...input.imageUrls]
  for (const file of input.imageFiles) {
    const result: any = await storage.upload('products', file)
    if (result?.error) throw result.error
    if (result?.url) uploaded.push(result.url as string)
  }
  const payload = {
    image_urls: uploaded,
    specs: input.specs,
    description: input.description,
    is_edited: true,
  }
  const { error } = await db.from('bot_catalog').update(payload).eq('id', input.id)
  if (error) throw error
}
