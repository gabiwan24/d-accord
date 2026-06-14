import { useCallback, useEffect, useRef, useState } from 'react'
import { shuffle } from '../lib/shuffle'

/** Slower chords (more time-to-correct) appear more often; unplayed get normal
 * priority. Accuracy is useless here (always 100%), so time is the yardstick. */
function timeWeight(avgMs: number | null): number {
  if (avgMs === null) return 2 // never played yet — normal priority
  if (avgMs < 2500) return 1 // fast — needs little practice
  if (avgMs < 5000) return 2
  return 3 // slow — practice most
}

function weightedShuffle(
  ids: string[],
  getAverageTime: (id: string) => number | null,
): string[] {
  const expanded: string[] = []
  for (const id of ids) {
    const weight = timeWeight(getAverageTime(id))
    for (let i = 0; i < weight; i++) expanded.push(id)
  }
  return shuffle(expanded)
}

export function useInfinitePracticeQueue(
  ids: string[],
  getAverageTime?: (id: string) => number | null,
) {
  const buildQueue = useCallback(
    () => (getAverageTime ? weightedShuffle(ids, getAverageTime) : shuffle(ids)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, getAverageTime],
  )

  const [queue, setQueue] = useState<string[]>(() => buildQueue())
  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)

  // Re-shuffle only when the inputs change — NOT on mount. The useState
  // initializer already built the first queue; re-shuffling on mount would
  // swap the first chord while transitionKey stays 0, desyncing the diagram.
  const didInitRef = useRef(false)
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    setQueue(buildQueue())
    setIndex(0)
    setCount(0)
  }, [buildQueue])

  const goNext = useCallback(() => {
    setCount((c) => c + 1)
    setIndex((i) => {
      const next = i + 1
      if (next >= queue.length) {
        setQueue(buildQueue())
        return 0
      }
      return next
    })
  }, [buildQueue, queue.length])

  const currentId = queue[index]
  const nextId =
    queue.length > 1 ? queue[(index + 1) % queue.length] : queue[0]

  return { currentId, nextId, goNext, count, queue }
}
