import { useEffect } from 'react'
import { isDesktopPointer, isEditableTarget } from '../lib/isDesktop'

export function useMicKeyboardShortcut(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.hidden) return
      if (!isDesktopPointer()) return
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== 'm' && event.key !== 'M') return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      onToggle()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])
}
