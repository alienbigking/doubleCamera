import i18n from '@/i18n/i18n'

export type SceneHintId = 'portrait' | 'night'

export type SceneHint = {
  id: SceneHintId
  label: string
  suggestion: string
}

export type SceneDetectionSnapshot = {
  hasFace: boolean
  isNight: boolean
}

const sceneHints: Record<SceneHintId, SceneHint> = {
  portrait: {
    id: 'portrait',
    label: i18n.t('sceneHints.portraitLabel'),
    suggestion: i18n.t('sceneHints.portraitSuggestion'),
  },
  night: {
    id: 'night',
    label: i18n.t('sceneHints.nightLabel'),
    suggestion: i18n.t('sceneHints.nightSuggestion'),
  },
}

export const resolveSceneHint = (
  snapshot: SceneDetectionSnapshot,
): SceneHint | null => {
  if (snapshot.isNight) return sceneHints.night
  if (snapshot.hasFace) return sceneHints.portrait
  return null
}
