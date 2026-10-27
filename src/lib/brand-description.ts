/** Preserve a concise introduction in the brand's own voice, without widget boilerplate. */
export function shortBrandDescription(name: string, ...sources: (string | undefined)[]): string {
  const brand = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let best = ''
  for (const source of sources) {
    const text = (source ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/([.!?]),\s.*$/, '$1').trim()
    const sentences = text.split(/(?<=[.!?])\s+/)
    const selected: string[] = []
    for (const sentence of sentences) {
      if (/\b(free shipping|returns|rewards?|cookies?|sign up|subscribe)\b/i.test(sentence)) continue
      let description = sentence
        .replace(new RegExp(`^shop\\s+${brand}\\s+for\\s+`, 'i'), `${name} offers `)
        .replace(/^(?:discover|explore)\s+(?:our\s+)?/i, name ? `${name} offers ` : '')
        .replace(/^shop\s+/i, name ? `${name} offers ` : '')
        .replace(/\s+exclusively at\s+[^.!?]+(?:\.[^\s.!?]+)*[.!?]?$/i, '.')
        .replace(/^get\s+(?:our\s+|the\s+)?/i, '')
        .replace(/[,;\s]+$/, '')
        .trim()
      if (!description || description.toLowerCase().replace(/[.!?]+$/, '') === name.trim().toLowerCase()) continue
      if (description.length > 320) continue // Never cut a factual statement halfway through.
      description = description[0].toUpperCase() + description.slice(1)
      if (selected.includes(description)) continue
      const candidate = [...selected, description].join(' ')
      if (candidate.length > 460 || candidate.split(/\s+/).length > 65) continue
      selected.push(description)
      if (selected.length === 3) break
    }
    const paragraph = selected.join(' ')
    if (paragraph.length > best.length) best = paragraph
  }
  return best
}
