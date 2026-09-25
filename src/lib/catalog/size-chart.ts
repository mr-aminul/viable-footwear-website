/**
 * Adult foot length chart by EU size (mm).
 */
export type SizeChartRow = {
  eu: number
  lengthFromMm: number
  lengthUntilMm: number
}

export const SIZE_CHART_ROWS: SizeChartRow[] = [
  { eu: 35, lengthFromMm: 221, lengthUntilMm: 225 },
  { eu: 36, lengthFromMm: 226, lengthUntilMm: 230 },
  { eu: 37, lengthFromMm: 231, lengthUntilMm: 240 },
  { eu: 38, lengthFromMm: 241, lengthUntilMm: 245 },
  { eu: 39, lengthFromMm: 246, lengthUntilMm: 250 },
  { eu: 40, lengthFromMm: 251, lengthUntilMm: 260 },
  { eu: 41, lengthFromMm: 261, lengthUntilMm: 265 },
  { eu: 42, lengthFromMm: 266, lengthUntilMm: 270 },
  { eu: 43, lengthFromMm: 271, lengthUntilMm: 280 },
  { eu: 44, lengthFromMm: 281, lengthUntilMm: 285 },
  { eu: 45, lengthFromMm: 286, lengthUntilMm: 290 },
  { eu: 46, lengthFromMm: 291, lengthUntilMm: 300 },
  { eu: 47, lengthFromMm: 301, lengthUntilMm: 305 },
  { eu: 48, lengthFromMm: 306, lengthUntilMm: 310 },
]
