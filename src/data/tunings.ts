export type TuningId = 'highG' | 'lowG'

export interface TuningString {
  name: string
  midi: number
}

export interface Tuning {
  id: TuningId
  label: string
  shortLabel: string
  strings: TuningString[]
}

export const TUNINGS: Record<TuningId, Tuning> = {
  highG: {
    id: 'highG',
    label: 'Standard (High G)',
    shortLabel: 'High G',
    strings: [
      { name: 'G', midi: 67 },
      { name: 'C', midi: 60 },
      { name: 'E', midi: 64 },
      { name: 'A', midi: 69 },
    ],
  },
  lowG: {
    id: 'lowG',
    label: 'Low G',
    shortLabel: 'Low G',
    strings: [
      { name: 'G', midi: 55 },
      { name: 'C', midi: 60 },
      { name: 'E', midi: 64 },
      { name: 'A', midi: 69 },
    ],
  },
}

export const TUNING_LIST: Tuning[] = [TUNINGS.highG, TUNINGS.lowG]
