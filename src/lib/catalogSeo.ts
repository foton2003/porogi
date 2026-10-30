/** Заголовок (H1 и title) в зависимости от типа детали и выбранного автомобиля. */
export function catalogHeading(
  type: string,
  brand: string,
  model: string,
  years: string,
  generation: string,
): string {
  const parts: string[] = []
  if (brand) parts.push(brand)
  if (model) parts.push(model)
  if (years) parts.push(years)
  else if (generation) parts.push(`поколение ${generation}`)
  const vehicle = parts.join(' ')
  const subject =
    type === 'порог' ? 'Ремонтные пороги' : type === 'арка' ? 'Ремонтные арки' : 'Ремонтные пороги и арки'
  return vehicle ? `${subject} для ${vehicle}` : 'Каталог ремонтных порогов и арок'
}

/** Description по шаблону из задания; пустые части автомобиля пропускаются. */
export function catalogDescription(brand: string, model: string, years: string): string {
  const vehicleParts = [brand, model].filter(Boolean)
  const label = years
    ? `${vehicleParts.join(' ')} ${years} года`.trim()
    : vehicleParts.join(' ')
  const tail =
    'От производителя со 100% повторением оригинальной детали. Гарантия от завода производителя.'
  return label
    ? `Новые ремонтные кузовные пороги и колёсные арки для ${label}. ${tail}`
    : `Новые ремонтные кузовные пороги и колёсные арки для автомобилей. ${tail}`
}

