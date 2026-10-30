import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { auth } from '@lork/sdk'
import {
  can, currentRoles, deleteArticle, downloadCsv, ensureProfile, getArticle, getProduct, listArticles, listOrders,
  listProducts, listProfiles, ordersToCsv, saveArticle, saveProduct, setProfileRole, updateOrderStatus,
  type Article, type Order, type ProductEdit, type Profile, type Role, type SpecRow,
} from './api'

type AuthState = { loading: boolean; profile: Profile | null; isAdmin: boolean }

const AuthContext = createContext<AuthState>({ loading: true, profile: null, isAdmin: false })
export const useAdminAuth = () => useContext(AuthContext)

function SignInPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res: any = await auth.signInWithPassword({ email, password })
      if (res?.needsEmailConfirmation) {
        setError('Подтвердите адрес электронной почты по письму и повторите вход.')
        return
      }
      nav('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Вход в админ-панель</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Электронная почта</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Пароль</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Нет аккаунта? <Link to="/admin/signup" className="text-accent hover:underline">Зарегистрироваться</Link>
      </p>
    </div>
  )
}

function SignUpPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res: any = await auth.signUpWithPassword({ email, password })
      if (res?.needsEmailConfirmation || !res?.session) {
        setMessage('Письмо с подтверждением отправлено. Подтвердите почту и войдите в систему.')
        return
      }
      nav('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Не удалось зарегистрироваться')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Регистрация</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Электронная почта</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Пароль</span>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-60">
          {busy ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Уже есть аккаунт? <Link to="/admin/login" className="text-accent hover:underline">Войти</Link>
      </p>
    </div>
  )
}

function Guard({ children, need }: { children: ReactNode; need: 'admin' }) {
  const { loading, profile, isAdmin } = useAdminAuth()
  if (loading) return <div className="p-10 text-center text-muted-foreground">Загрузка…</div>
  if (!profile) return <Navigate to="/admin/login" replace />
  if (need === 'admin' && !isAdmin) return <div className="mx-auto max-w-lg p-10 text-center"><p className="font-semibold">Недостаточно прав</p><p className="mt-2 text-sm text-muted-foreground">Раздел доступен только администратору.</p></div>
  return <>{children}</>
}

function Shell({ children }: { children: ReactNode }) {
  const { profile, isAdmin } = useAdminAuth()
  const nav = useNavigate()
  const items = [
    { to: '/admin/articles', label: 'Статьи', show: true },
    { to: '/admin/products', label: 'Товары', show: isAdmin },
    { to: '/admin/orders', label: 'Заказы', show: isAdmin },
    { to: '/admin/users', label: 'Пользователи', show: isAdmin },
  ]
  return (
    <div className="min-h-[70vh] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Админ-панель</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.displayName || profile?.email} · {profile?.role === 'admin' ? 'Администратор' : 'Редактор'}
            </p>
          </div>
          <button onClick={async () => { await auth.signOut?.(); nav('/admin/login', { replace: true }) }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            Выйти
          </button>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2 border-b border-border">
          {items.filter((i) => i.show).map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => `border-b-2 px-4 py-2 text-sm ${isActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function ArticlesPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listArticles({ q: q || undefined, status: status || undefined, page, pageSize })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось загрузить статьи')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [page, q, status])
  useEffect(() => { setPage(1) }, [q, status])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-3 border-b border-border p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по заголовку" className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-base">
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
        </select>
        <Link to="/admin/articles/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Новая статья</Link>
      </div>
      {error && <p className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr><th className="px-4 py-3">Заголовок</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Дата</th><th className="px-4 py-3">Действия</th></tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Загрузка…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Статей нет</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">{r.title}</td>
              <td className="px-4 py-3">{r.status === 'published' ? 'Опубликовано' : 'Черновик'}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
              <td className="px-4 py-3">
                <Link to={`/admin/articles/${r.id}`} className="text-accent hover:underline">Редактировать</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Всего: {total}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Назад</button>
          <span className="px-2 py-1.5 text-muted-foreground">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Вперёд</button>
        </div>
      </div>
    </div>
  )
}

function ArticleFormPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('draft')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const a = await getArticle(id)
        if (a) { setTitle(a.title); setBody(a.body); setStatus(a.status); setImageUrl(a.imageUrl) }
        else setError('Статья не найдена')
      } catch (e: any) { setError(e?.message ?? 'Не удалось загрузить статью') } finally { setLoading(false) }
    })()
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const savedId = await saveArticle({ id, title, body, status, imageFile, imageUrl })
      nav(`/admin/articles/${savedId}`, { replace: true })
    } catch (e: any) { setError(e?.message ?? 'Не удалось сохранить') } finally { setBusy(false) }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Загрузка…</div>

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{id ? 'Редактирование статьи' : 'Новая статья'}</h2>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Заголовок</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Текст</span>
        <textarea required rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Статус</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base">
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Изображение</span>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
      </label>
      {imageUrl && <img src={imageUrl} alt="Текущее изображение" className="h-40 rounded-md object-cover" />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        <Link to="/admin/articles" className="rounded-md border border-border px-5 py-2.5 text-sm">Отмена</Link>
      </div>
    </form>
  )
}

function OrdersPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await listOrders({ q: q || undefined, status: status || undefined, page, pageSize })
      setRows(res.rows); setTotal(res.total)
    } catch (e: any) { setError(e?.message ?? 'Не удалось загрузить заказы') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [page, q, status])
  useEffect(() => { setPage(1) }, [q, status])

  const changeStatus = async (id: string, value: string) => {
    try { await updateOrderStatus(id, value); await load() } catch (e: any) { setError(e?.message ?? 'Не удалось обновить статус') }
  }

  const exportCsv = async () => {
    try {
      const res = await listOrders({ q: q || undefined, status: status || undefined, page: 1, pageSize: 1000 })
      downloadCsv(`orders-${Date.now()}.csv`, ordersToCsv(res.rows))
    } catch (e: any) { setError(e?.message ?? 'Не удалось выгрузить CSV') }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-3 border-b border-border p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, клиент или телефон" className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-base">
          <option value="">Все статусы</option>
          <option value="new">Новый</option>
          <option value="processing">В обработке</option>
          <option value="done">Завершён</option>
        </select>
        <button onClick={exportCsv} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Экспорт CSV</button>
      </div>
      {error && <p className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3">Номер</th><th className="px-4 py-3">Дата</th><th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Город</th><th className="px-4 py-3">Сумма</th><th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Загрузка…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Заказов нет</td></tr>}
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                <td className="px-4 py-3">{o.customerName}<div className="text-xs text-muted-foreground">{o.phone}</div></td>
                <td className="px-4 py-3">{o.city}</td>
                <td className="px-4 py-3">{o.total.toLocaleString('ru-RU')} ₽</td>
                <td className="px-4 py-3">
                  <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                    <option value="new">Новый</option>
                    <option value="processing">В обработке</option>
                    <option value="done">Завершён</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Всего: {total}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Назад</button>
          <span className="px-2 py-1.5 text-muted-foreground">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Вперёд</button>
        </div>
      </div>
    </div>
  )
}

function ProductsPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ProductEdit[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await listProducts({ q: q || undefined, page, pageSize })
      setRows(res.rows); setTotal(res.total)
    } catch (e: any) { setError(e?.message ?? 'Не удалось загрузить товары') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [page, q])
  useEffect(() => { setPage(1) }, [q])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-3 border-b border-border p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Марка, модель или поколение" className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base" />
      </div>
      {error && <p className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3">Товар</th>
              <th className="px-4 py-3">Фото</th>
              <th className="px-4 py-3">Характеристики</th>
              <th className="px-4 py-3">Правки</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Загрузка…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Товаров нет</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.brand} {p.model}</div>
                  <div className="text-xs text-muted-foreground">{[p.generation, p.body, p.years].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-4 py-3">
                  {p.imageUrls.length > 0 ? (
                    <div className="flex gap-1">
                      {p.imageUrls.slice(0, 3).map((u, i) => (
                        <img key={i} src={u} alt="" className="h-10 w-10 rounded object-cover" />
                      ))}
                      {p.imageUrls.length > 3 && <span className="self-center text-xs text-muted-foreground">+{p.imageUrls.length - 3}</span>}
                    </div>
                  ) : <span className="text-muted-foreground">нет</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.specs.length > 0 ? `${p.specs.length} шт.` : 'нет'}</td>
                <td className="px-4 py-3">
                  {p.isEdited
                    ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">изменено</span>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/admin/products/${p.id}`} className="text-accent hover:underline">Редактировать</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Всего: {total}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Назад</button>
          <span className="px-2 py-1.5 text-muted-foreground">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Вперёд</button>
        </div>
      </div>
    </div>
  )
}

function ProductFormPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<ProductEdit | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [specs, setSpecs] = useState<SpecRow[]>([])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const p = await getProduct(id)
        if (!p) { setError('Товар не найден'); return }
        setProduct(p)
        setImages(p.imageUrls)
        setSpecs(p.specs.length > 0 ? p.specs : [{ name: '', value: '' }])
        setDescription(p.description)
      } catch (e: any) { setError(e?.message ?? 'Не удалось загрузить товар') } finally { setLoading(false) }
    })()
  }, [id])

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index))
  const moveImage = (index: number, dir: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const updateSpec = (index: number, patch: Partial<SpecRow>) =>
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setBusy(true); setError(''); setNotice('')
    const cleaned = specs.filter((s) => s.name.trim() || s.value.trim())
    try {
      await saveProduct({ id, imageUrls: images, imageFiles: newFiles, specs: cleaned, description: description.trim() })
      setNewFiles([])
      const refreshed = await getProduct(id)
      if (refreshed) {
        setProduct(refreshed)
        setImages(refreshed.imageUrls)
        setSpecs(refreshed.specs.length > 0 ? refreshed.specs : [{ name: '', value: '' }])
        setDescription(refreshed.description)
      }
      setNotice('Изменения сохранены')
    } catch (e: any) { setError(e?.message ?? 'Не удалось сохранить') } finally { setBusy(false) }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Загрузка…</div>
  if (!product) return <div className="p-8 text-center text-destructive">{error || 'Товар не найден'}</div>

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{product.brand} {product.model}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[product.generation, product.body, product.years].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link to="/admin/products" className="rounded-md border border-border px-4 py-2 text-sm">К списку</Link>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Фотографии</h3>
        <p className="text-xs text-muted-foreground">Первое фото показывается в каталоге и карточке товара. Порядок можно менять стрелками.</p>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((url, i) => (
              <div key={`${url}-${i}`} className="rounded-md border border-border bg-secondary/40 p-2">
                <img src={url} alt={`Фото ${i + 1}`} className="h-28 w-full rounded object-cover" />
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40" aria-label="Переместить левее">←</button>
                  <span className="text-xs text-muted-foreground">№{i + 1}</span>
                  <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}
                    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40" aria-label="Переместить правее">→</button>
                  <button type="button" onClick={() => removeImage(i)}
                    className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Добавить фото</span>
          <input type="file" accept="image/*" multiple onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) {
              setNewFiles((prev) => [...prev, ...files])
              setImages((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
            }
            e.target.value = ''
          }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
        </label>
        {newFiles.length > 0 && <p className="text-xs text-muted-foreground">Новых файлов: {newFiles.length} — загрузятся при сохранении.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Характеристики</h3>
          <button type="button" onClick={() => setSpecs((prev) => [...prev, { name: '', value: '' }])}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">+ Добавить</button>
        </div>
        {specs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input value={s.name} onChange={(e) => updateSpec(i, { name: e.target.value })} placeholder="Название"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input value={s.value} onChange={(e) => updateSpec(i, { value: e.target.value })} placeholder="Значение"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-md border border-destructive/40 px-3 text-sm text-destructive" aria-label="Удалить характеристику">✕</button>
          </div>
        ))}
        {specs.length === 0 && <p className="text-sm text-muted-foreground">Характеристик пока нет.</p>}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Описание</h3>
        <textarea rows={7} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробное описание товара для карточки на сайте"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={busy}
          className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-60">
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <Link to="/admin/products" className="rounded-md border border-border px-5 py-2.5 text-sm">Отмена</Link>
      </div>
    </form>
  )
}

function UsersPage() {
  const [rows, setRows] = useState<Profile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await listProfiles())
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const change = async (id: string, role: Role) => {
    try {
      await setProfileRole(id, role)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось изменить роль')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {error && <p className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr>
            <th className="px-4 py-3">Пользователь</th>
            <th className="px-4 py-3">Почта</th>
            <th className="px-4 py-3">Роль</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Загрузка…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Пользователей пока нет</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">{r.displayName || '—'}</td>
              <td className="px-4 py-3">{r.email}</td>
              <td className="px-4 py-3">
                <select value={r.role} onChange={(e) => change(r.id, e.target.value as Role)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <option value="admin">Админ</option>
                  <option value="editor">Редактор</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminApp() {
  const [state, setState] = useState<AuthState>({ loading: true, profile: null, isAdmin: false })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const roles = await currentRoles()
        const profile = await ensureProfile()
        if (alive) setState({ loading: false, profile, isAdmin: roles.includes('admin') })
      } catch {
        if (alive) setState({ loading: false, profile: null, isAdmin: false })
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <AuthContext.Provider value={state}>
      <Routes>
        <Route path="login" element={<SignInPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="articles" element={<Shell><ArticlesPage /></Shell>} />
        <Route path="articles/new" element={<Shell><ArticleFormPage /></Shell>} />
        <Route path="articles/:id" element={<Shell><ArticleFormPage /></Shell>} />
        <Route path="products" element={<Guard need="admin"><Shell><ProductsPage /></Shell></Guard>} />
        <Route path="products/:id" element={<Guard need="admin"><Shell><ProductFormPage /></Shell></Guard>} />
        <Route path="orders" element={<Guard need="admin"><Shell><OrdersPage /></Shell></Guard>} />
        <Route path="users" element={<Guard need="admin"><Shell><UsersPage /></Shell></Guard>} />
        <Route path="*" element={<Navigate to="/admin/articles" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default AdminApp
