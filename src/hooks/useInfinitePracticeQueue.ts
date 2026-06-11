import { useCallback, useEffect, useState } from 'react'
import { shuffle } from '../lib/shuffle'

export function useInfinitePracticeQueue(ids: string[]) {
  const [queue, setQueue] = useState<string[]>(() => shuffle(ids))
  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setQueue(shuffle(ids))
    setIndex(0)
    setCount(0)
  }, [ids])

  const goNext = useCallback(() => {
    setCount((c) => c + 1)
    setIndex((i) => {
      const next = i + 1
      if (next >= queue.length) {
        setQueue(shuffle(ids))
        return 0
      }
      return next
    })
  }, [ids, queue.length])

  const currentId = queue[index]
  const nextId =
    queue.length > 1 ? queue[(index + 1) % queue.length] : queue[0]

  return { currentId, nextId, goNext, count, queue }
}
