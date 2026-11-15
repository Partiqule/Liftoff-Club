'use client'

import { useMemo, useState } from 'react'
import { Cited } from '@/components/pro/cited'
import { useProStore } from '@/components/pro/use-pro-store'
import { addTarget, removeTarget, targetKey } from '@/lib/pro/watch'
import type { TrackerRow } from '@/lib/pro/tracker'

type SortKey = 'name' | 'operator' | 'inOrbit' | 'launchesThisYear' | 'authorized' | 'capacity' | 'lastLaunch' | 'nextLaunch' | 'ai'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Constellation' },
  { key: 'operator', label: 'Operator' },
  { key: 'inOrbit', label: 'In orbit' },
  { key: 'launchesThisYear', label: 'Launches this year' },
  { key: 'authorized', label: 'Authorized or planned' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'lastLaunch', label: 'Last launch' },
  { key: 'nextLaunch', label: 'Next launch' },
  { key: 'ai', label: 'AI in orbit' },
]

export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const { store, setStore } = useProStore()
  const ordered = useMemo(() => {
    const copy = rows.slice()
    copy.sort((a, b) => compare(a, b, sort.key) * (sort.dir === 'asc' ? 1 : -1))
    return copy
  }, [rows, sort])

  function toggleSort(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return (
    <div className="pro-scroll">
      <table className="pro-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggleSort(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
            <th scope="col">Watch</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => {
            const key = targetKey({ kind: 'constellation', id: row.id })
            const on = store.targets.some((item) => targetKey(item) === key)
            return (
              <tr key={row.id}>
                <th scope="row">{row.name}</th>
                <td>{row.operator}</td>
                <td><Cited cell={row.inOrbit} /></td>
                <td><Cited cell={row.launchesThisYear} /></td>
                <td><Cited cell={row.authorized} /></td>
                <td><Cited cell={row.capacity} /></td>
                <td><Cited cell={row.lastLaunch} /></td>
                <td><Cited cell={row.nextLaunch} /></td>
                <td><Cited cell={row.ai} /></td>
                <td>
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      setStore(
                        on
                          ? removeTarget(store, key)
                          : addTarget(store, { kind: 'constellation', id: row.id, label: row.name, addedAt: new Date().toISOString() }),
                      )
                    }
                  >
                    {on ? 'Watching' : 'Watch'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function compare(a: TrackerRow, b: TrackerRow, key: SortKey): number {
  if (key === 'name' || key === 'operator') return a[key].localeCompare(b[key])
  const left = a[key].sort
  const right = b[key].sort
  if (left == null && right == null) return a.name.localeCompare(b.name)
  if (left == null) return 1
  if (right == null) return -1
  return left - right
}
