/** Small public-font catalog; no account, key or metadata API needed. */
export const FONT_OPTIONS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Manrope', 'DM Sans', 'Work Sans', 'Source Sans 3', 'Nunito Sans', 'Raleway', 'Oswald', 'Barlow', 'Playfair Display', 'Libre Baskerville', 'Lora', 'Merriweather', 'Roboto Slab', 'Space Grotesk'] as const
export function commonFontName(value: string): string | undefined {
  return FONT_OPTIONS.find(name => name.toLowerCase() === value.trim().toLowerCase())
}
