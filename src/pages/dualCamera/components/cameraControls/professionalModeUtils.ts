export const defaultProfessionalShutterDuration = 1 / 120

const shutterPresetCandidates = [
  1 / 2000,
  1 / 1000,
  1 / 500,
  1 / 250,
  1 / 120,
  1 / 60,
  1 / 30,
  1 / 15,
  1 / 8,
  1 / 4,
]

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const getSupportedShutterPresets = (
  minDuration: number,
  maxDuration: number,
) => {
  if (minDuration <= 0 || maxDuration <= 0) {
    return [defaultProfessionalShutterDuration]
  }

  const presets = shutterPresetCandidates.filter(
    duration => duration >= minDuration && duration <= maxDuration,
  )

  return presets.length > 0
    ? presets
    : [
        clampNumber(
          defaultProfessionalShutterDuration,
          minDuration,
          maxDuration,
        ),
      ]
}

export const formatShutterDuration = (duration: number) => {
  if (duration <= 0) return '自动'
  if (duration >= 1) return `${duration.toFixed(1)}s`
  return `1/${Math.max(1, Math.round(1 / duration))}`
}

export const formatFocusPercent = (value: number) =>
  `${Math.round(clampNumber(value, 0, 1) * 100)}%`
