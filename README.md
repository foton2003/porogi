# Vite + React + TypeScript Template

This is a template project with Vite, React, TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- ⚡️ Vite for fast development and building
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🧩 shadcn/ui components
- 📁 Path aliases (@/ for src/)

## Project Structure

\`\`\`
src/
├── components/
│   └── ui/          # shadcn/ui components
├── lib/
│   └── utils.ts     # Utility functions
├── App.tsx          # Main application component
├── main.tsx         # Entry point
└── index.css        # Global styles with Tailwind
\`\`\`

## Фид Яндекс.Маркета

`/yandex.xml` и `public/uploads/yandex.xml` собираются из одного источника —
`YANDEX_XML_DOCUMENT` в `src/data/yandexXml.ts` (шапка магазина, фрагменты
`src/feed/yandex-part-*.ts`, блок `<collections>` из `src/features/collections.ts`).

После изменения шаблонов фида, цен или каталога файл `public/uploads/yandex.xml`
нужно пересобрать тем же содержимым, что отдаёт `/yandex.xml`, и заново
опубликовать сайт.

## Пенки (двери и багажник)

Товары «Пенка задней двери», «Пенка передней двери» и «Пенка багажника двери»
генерируются из колонки «Что производим» таблицы каталога
(`src/data/catalog.ts`, `FOAM_PARTS`) и показываются в каталоге только при
одновременно выбранных марке, модели и годе выпуска. В фид Яндекс.Маркета
пенки не входят: фрагменты `src/feed/yandex-part-*` и `public/uploads/yandex.xml`
построены из `PARTS` и не пересобираются при добавлении пенок.
