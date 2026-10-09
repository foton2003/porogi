/**
 * Скрипт вызова формы обратного звонка для первого визита.
 *
 * Форму показываем, если это первый визит: посетитель ни разу не отправлял
 * форму и не кликал по номеру телефона, и прошло 30 секунд на сайте либо он
 * попытался закрыть сайт (вкладку, свернул её или перешёл на другой сайт).
 * Повторно в рамках одного визита скрипт не срабатывает. Интервал показа,
 * подпись формы и данные предыдущих форм берутся из Cookie.
 */

export const CALLBACK_COOKIES = {
  /** Данные для подстановки в форму (JSON: имя, телефон, подпись). */
  profile: 'sill-arch-callback-profile-v1',
  /** «1» — посетитель уже отправлял форму или кликал по номеру телефона. */
  contact: 'sill-arch-callback-contact-v1',
  /** «1» — посетитель начал смотреть сайт: «первый визит» отслеживается от него. */
  seen: 'sill-arch-callback-seen-v1',
  /** «1» — форма показывалась в этом визите, повторно не показываем. */
  promptShown: 'sill-arch-callback-prompt-shown-v1',
  /** «1» — посетитель сам закрыл показ формы. */
  dismissed: 'sill-arch-callback-dismissed-v1',
  /** Необязательная настройка: интервал показа в секундах (по умолчанию 30). */
  interval: 'sill-arch-callback-interval-v1',
  /** Необязательная настройка: подпись у формы обратного звонка. */
  prompt: 'sill-arch-callback-prompt-v1',
} as const

export const DEFAULT_SHOW_DELAY_MS = 30_000

/** Триггер, по которому форма была показана. */
export type CallbackTrigger = 'timer' | 'exit' | 'manual'

/** Данные визита для подстановки в форму и для передачи в заказ. */
export interface CallbackProfile {
  /** Имя из заполненной формы (или имя, введённое посетителем). */
  name?: string
  /** Телефон из заполненной формы (формат +7XXXXXXXXXX). */
  phone?: string
  /** Причина показа: таймер или попытка закрыть сайт. */
  trigger?: CallbackTrigger
  /** Вкладки и детали, которые посетитель уже смотрел. */
  viewed?: Array<{ title: string; sku?: string; href: string }>
}

export type CallbackEvent =
  | { type: 'callback-form-shown'; trigger: CallbackTrigger }
  | { type: 'callback-form-dismissed' }

type Listener = (event: CallbackEvent) => void

const listeners = new Set<Listener>()

export function onCallbackEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(event: CallbackEvent): void {
  for (const listener of [...listeners]) listener(event)
}

export function readCookie(name: string): string | null {
  const prefix = `${name}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
  }
  return null
}

/** Записывает Cookie на год; возвращает false, если браузер не дал доступ. */
export function writeCookie(name: string, value: string): boolean {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const sameSite = '; SameSite=Lax'
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; Expires=${expires}${sameSite}${secure}`
  } catch {
    return false
  }
  // Проверяем, что Cookie реально записались (частный режим браузера).
  return readCookie(name) !== null
}

function parseProfile(raw: string | null): CallbackProfile {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as CallbackProfile
  } catch {
    return {}
  }
}

/** Запоминает данные визита (имя, телефон, просмотренные детали) в Cookie. */
export function rememberCallbackProfile(patch: Partial<CallbackProfile>): void {
  const current = parseProfile(readCookie(CALLBACK_COOKIES.profile))
  const next: CallbackProfile = { ...current, ...patch }
  writeCookie(CALLBACK_COOKIES.profile, JSON.stringify(next))
}

/** Возвращает сохранённые данные визита. */
export function getCallbackProfile(): CallbackProfile {
  return parseProfile(readCookie(CALLBACK_COOKIES.profile))
}

/** Интервал показа формы: из Cookie или 30 секунд по умолчанию. */
export function getShowDelayMs(): number {
  const raw = readCookie(CALLBACK_COOKIES.interval)
  if (!raw) return DEFAULT_SHOW_DELAY_MS
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds < 1) return DEFAULT_SHOW_DELAY_MS
  return Math.min(seconds, 86_400) * 1000
}

/** Подпись формы: из Cookie или пустая строка. */
export function getPrompt(): string {
  const raw = readCookie(CALLBACK_COOKIES.prompt)
  return raw && raw.trim() ? raw.trim().slice(0, 160) : ''
}

/** Посетитель уже оставил контакт (форма или клик по телефону). */
export function hasLeftContact(): boolean {
  return readCookie(CALLBACK_COOKIES.contact) === '1'
}

/** Отправил форму или кликнул по номеру телефона — скрипт выключается. */
export function markContact(): void {
  writeCookie(CALLBACK_COOKIES.contact, '1')
}

/** Клик по номеру телефона (буквально клик по телефону). */
export function markPhoneClick(): void {
  markContact()
}

/** Отправка любой формы на сайте. */
export function markFormSent(): void {
  markContact()
}

/** Форма показывалась в этом визите. */
export function wasPromptShown(): boolean {
  return readCookie(CALLBACK_COOKIES.promptShown) === '1'
}

/** Посетитель сам закрывал форму показа. */
export function isDismissed(): boolean {
  return readCookie(CALLBACK_COOKIES.dismissed) === '1'
}

/** Это первый визит: посетитель ещё не видел сайт (флаг ставится при старте). */
export function isFirstVisit(): boolean {
  return readCookie(CALLBACK_COOKIES.seen) !== '1'
}

/** Отмечает, что посетитель зашёл на сайт. */
export function markSeen(): void {
  if (isFirstVisit()) writeCookie(CALLBACK_COOKIES.seen, '1')
}

/** Можно ли показывать форму: первый визит, не было контакта и показа. */
export function canShow(): boolean {
  if (!isFirstVisit()) return false
  if (hasLeftContact() || isDismissed() || wasPromptShown()) return false
  return true
}

/** Помечает форму показанной и рассылает событие слушателям. */
export function showCallback(trigger: CallbackTrigger): void {
  if (!canShow()) return
  if (!writeCookie(CALLBACK_COOKIES.promptShown, '1')) return
  emit({ type: 'callback-form-shown', trigger })
}

/** Посетитель закрыл форму — больше не показываем. */
export function dismissCallback(): void {
  writeCookie(CALLBACK_COOKIES.dismissed, '1')
  emit({ type: 'callback-form-dismissed' })
}
