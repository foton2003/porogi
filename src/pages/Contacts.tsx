import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { markPhoneClick } from '@/lib/callbackScript'

const ADDRESS = 'г. Санкт-Петербург, ул. Бабушкина, 36, корп. 1'
const PHONE = '+7 (800) 350-16-24'
const PHONE_HREF = 'tel:+78003501624'
const SITE_URL = 'https://porogi.pro/'

/* Микроразметка Schema.org: организация-продавец (общая для сайта). */
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Магазин кузовных порогов и арок',
  url: SITE_URL,
  telephone: PHONE,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'ул. Бабушкина, 36, корп. 1',
    addressLocality: 'Санкт-Петербург',
    addressCountry: 'RU',
  },
}

const points = [
  {
    title: 'Адрес производства',
    address: ADDRESS,
    phone: PHONE,
    phoneHref: PHONE_HREF,
  },
  {
    title: 'Адрес пункта выдачи',
    address: ADDRESS,
    phone: PHONE,
    phoneHref: PHONE_HREF,
  },
]

export default function Contacts() {
  /* Отметка первого визита — чтобы скрипт обратного звонка срабатывал
     один раз: клик по телефону и отправка любой формы его отключают. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null
      if (target) markPhoneClick()
    }
    document.addEventListener('click', onClick)
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(ORGANIZATION_SCHEMA)
    document.head.appendChild(script)
    return () => {
      document.removeEventListener('click', onClick)
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Контакты</h1>
        <p className="mt-2 text-muted-foreground">
          Свяжитесь с нами по вопросам заказа порогов и колёсных арок.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {points.map((point) => (
          <section
            key={point.title}
            className="rounded-xl border border-border bg-card p-5"
            aria-label={point.title}
          >
            <h2 className="font-semibold text-[#16a34a]">{point.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{point.address}</p>
            <a
              href={point.phoneHref}
              className="mt-3 inline-flex min-h-11 items-center text-lg font-bold text-accent transition-colors hover:text-accent/80"
            >
              Тел: {point.phone}
            </a>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/catalog"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Перейти в каталог
        </Link>
      </div>
    </div>
  )
}
