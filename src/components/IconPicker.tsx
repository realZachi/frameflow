import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { iconCatalog, iconGroups, type IconCatalogEntry } from '../icons'

type IconPickerProps = {
  onSelect: (iconId: string) => void
  selectedIcon?: string
}

const matchesQuery = (entry: IconCatalogEntry, query: string) => {
  if (!query) return true
  const lower = query.toLowerCase()
  return entry.id.includes(lower) || entry.label.toLowerCase().includes(lower) || entry.group.toLowerCase().includes(lower)
}

export const IconPicker = ({ onSelect, selectedIcon }: IconPickerProps) => {
  const [query, setQuery] = useState('')
  const filtered = iconCatalog.filter((entry) => matchesQuery(entry, query))

  return (
    <div className="icon-picker">
      <input
        type="search"
        className="icon-picker-search"
        placeholder="Search icons…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search icons"
      />
      {query
        ? (
            <div className="icon-picker-grid">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  className={`icon-picker-cell${selectedIcon === entry.id ? ' is-selected' : ''}`}
                  onClick={() => onSelect(entry.id)}
                  title={entry.label}
                  aria-label={entry.label}
                >
                  <HugeiconsIcon icon={entry.icon} size={20} primaryColor="#c3c2b9" />
                </button>
              ))}
              {filtered.length === 0 && <p className="icon-picker-empty">No icons found</p>}
            </div>
          )
        : (
            iconGroups.map((group) => {
              const groupIcons = iconCatalog.filter((entry) => entry.group === group)
              if (groupIcons.length === 0) return null
              return (
                <div className="icon-picker-group" key={group}>
                  <h4>{group}</h4>
                  <div className="icon-picker-grid">
                    {groupIcons.map((entry) => (
                      <button
                        key={entry.id}
                        className={`icon-picker-cell${selectedIcon === entry.id ? ' is-selected' : ''}`}
                        onClick={() => onSelect(entry.id)}
                        title={entry.label}
                        aria-label={entry.label}
                      >
                        <HugeiconsIcon icon={entry.icon} size={20} primaryColor="#c3c2b9" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
    </div>
  )
}
