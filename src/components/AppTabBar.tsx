import { MicToggleButton } from './MicToggleButton'

export type AppTab = 'practice' | 'tuner'

interface AppTabBarProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'practice', label: 'Üben' },
  { id: 'tuner', label: 'Stimmgerät' },
]

export function AppTabBar({ activeTab, onChange }: AppTabBarProps) {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-cream/95 backdrop-blur-sm"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        <div className="grid min-w-0 flex-1 grid-cols-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`touch-target py-3 text-sm transition-colors ${
                  active
                    ? 'font-medium text-ink'
                    : 'text-muted active:text-ink'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <MicToggleButton />
      </div>
    </nav>
  )
}
