/**
 * Передача данных форм сайта в UIS (CoMagic).
 *
 * Скрипт UIS подключён в index.html с атрибутом async, поэтому к моменту
 * отправки формы window.Comagic может быть ещё не готов. Помощник ждёт его
 * появления, передаёт заявку методом addOfflineRequest и никогда не влияет на
 * результат отправки формы: сбой UIS только пропускается.
 */

/** Заявка, которую нужно передать в UIS. */
export interface UisLead {
  /** Имя посетителя; для форм без имени не передаётся. */
  name?: string
  /** Телефон в любом формате — нормализуется в +7XXXXXXXXXX. */
  phone: string
  /** Текст заявки: состав заказа, комментарий, страница. */
  message: string
}

interface UisOfflineRequest {
  name?: string
  phone?: string
  message?: string
}

interface ComagicApi {
  addOfflineRequest?: (request: UisOfflineRequest) => void
}

declare global {
  interface Window {
    Comagic?: ComagicApi
  }
}

const RETRY_INTERVAL_MS = 250
const WAIT_TIMEOUT_MS = 5000

/** Приводит телефон к виду +7XXXXXXXXXX; пустая строка — цифр недостаточно. */
export function normalizeUisPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  const national = digits.replace(/^[78]/, '')
  return national.length === 10 ? `+7${national}` : ''
}

/** Ждёт появления window.Comagic.addOfflineRequest (скрипт грузится асинхронно). */
function waitForComagic(): Promise<ComagicApi | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  const ready = window.Comagic
  if (ready?.addOfflineRequest) return Promise.resolve(ready)

  return new Promise((resolve) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const api = window.Comagic
      if (api?.addOfflineRequest) {
        window.clearInterval(timer)
        resolve(api)
        return
      }
      if (Date.now() - startedAt >= WAIT_TIMEOUT_MS) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, RETRY_INTERVAL_MS)
  })
}

/**
 * Передаёт сохранённую заявку в UIS. Вызывается только после успешной записи
 * заявки и никогда не выбрасывает ошибку наружу.
 */
export async function sendUisLead(lead: UisLead): Promise<void> {
  const phone = normalizeUisPhone(lead.phone)
  if (!phone) return

  const comagic = await waitForComagic()
  if (!comagic?.addOfflineRequest) return

  const name = lead.name?.trim()
  const request: UisOfflineRequest = {
    ...(name ? { name: name.slice(0, 100) } : {}),
    phone,
    message: lead.message.trim().slice(0, 2000),
  }

  try {
    comagic.addOfflineRequest(request)
  } catch {
    // UIS не должен ломать отправку формы — заявка уже сохранена.
  }
}
