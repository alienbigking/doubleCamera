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
    label: '已识别人像',
    suggestion: '当前更适合画中画构图，让人物保持在主画面中心。',
  },
  night: {
    id: 'night',
    label: '检测到低光环境',
    suggestion: '建议保持稳定持机，必要时开启 HDR 或低光增强。',
  },
}

export const resolveSceneHint = (
  snapshot: SceneDetectionSnapshot,
): SceneHint | null => {
  if (snapshot.isNight) return sceneHints.night
  if (snapshot.hasFace) return sceneHints.portrait
  return null
}
