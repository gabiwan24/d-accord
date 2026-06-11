import { useEffect, useState } from 'react'
import { isDesktopPointer } from '../lib/isDesktop'

export function useIsDesktopPointer(): boolean {
  const [desktop, setDesktop] = useState(() => isDesktopPointer())

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return desktop
}
