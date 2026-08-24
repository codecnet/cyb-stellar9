'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useClient } from '@/contexts/ClientContext'
import { iocListApi } from '@/lib/api'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CdbListFile {
  filename: string
  relative_dirname: string
  status?: string
}

interface CdbEntry {
  key: string
  value: string
}

type View = 'main' | 'edit'

// ─── CDB Parse / Serialize ───────────────────────────────────────────────────

function parseCdb(content: string): CdbEntry[] {
  const trimmed = content.trim()

  // Handle JSON object format { "key": "value", ... }
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      return Object.entries(obj).map(([key, value]) => ({
        key,
        value: value != null ? String(value) : '',
      }))
    } catch { /* fall through to line-by-line parsing */ }
  }

  // Plain CDB format: one "key:value" per line
  return trimmed
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .map(line => {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) return { key: line.trim(), value: '' }
      return {
        key: line.substring(0, colonIdx).trim(),
        value: line.substring(colonIdx + 1).trim(),
      }
    })
    .filter(e => e.key.length > 0)
}

function serializeCdb(entries: CdbEntry[]): string {
  return entries.map(e => (e.value ? `${e.key}:${e.value}` : `${e.key}:`)).join('\n')
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function IocListPage() {
  const { selectedClient } = useClient()
  const orgId = selectedClient?.id

  const [view, setView] = useState<View>('main')
  const [editingFile, setEditingFile] = useState<CdbListFile | null>(null)

  // ── Main view state ──────────────────────────────────────────────────────
  const [files, setFiles] = useState<CdbListFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // ── Inline create form ───────────────────────────────────────────────────
  const [showInlineCreate, setShowInlineCreate] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListNameError, setNewListNameError] = useState('')
  const [newEntries, setNewEntries] = useState<CdbEntry[]>([])
  const [creating, setCreating] = useState(false)

  // ── CSV Import ───────────────────────────────────────────────────────────
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ name: string; status: 'success' | 'error'; message?: string }[]>([])
  const [showImportResults, setShowImportResults] = useState(false)

  // ── Delete confirm ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<CdbListFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Edit view state ──────────────────────────────────────────────────────
  const [entries, setEntries] = useState<CdbEntry[]>([])
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Inline editing
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // Add entry
  const [showAddRow, setShowAddRow] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [addRowError, setAddRowError] = useState('')

  // Single-file CSV append import (edit view)
  const appendInputRef = useRef<HTMLInputElement>(null)
  const [appending, setAppending] = useState(false)

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Load files ───────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true)
    setFilesError(null)
    try {
      const res = await iocListApi.getListFiles({ orgId })
      const items: CdbListFile[] = res?.data?.affected_items ?? []
      setFiles(items)
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'Failed to load IOC lists')
    } finally {
      setLoadingFiles(false)
    }
  }, [orgId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // ── Open edit view ────────────────────────────────────────────────────────
  const openEdit = async (file: CdbListFile) => {
    setEditingFile(file)
    setView('edit')
    setEntries([])
    setContentError(null)
    setEditingRowIdx(null)
    setShowAddRow(false)
    setLoadingContent(true)
    try {
      const res = await iocListApi.getListFileContent(file.filename, orgId)
      const raw: string = res?.data?.content ?? ''
      setEntries(parseCdb(raw))
    } catch (err: unknown) {
      setContentError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoadingContent(false)
    }
  }

  // ── Save (full file) ──────────────────────────────────────────────────────
  const saveFile = async (updatedEntries: CdbEntry[]) => {
    if (!editingFile) return
    setSaving(true)
    try {
      const content = serializeCdb(updatedEntries)
      await iocListApi.saveListFile(editingFile.filename, content, orgId)
      setEntries(updatedEntries)
      showToast('success', `Saved ${editingFile.filename}`)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Inline edit handlers ──────────────────────────────────────────────────
  const startEdit = (idx: number) => {
    setEditingRowIdx(idx)
    setEditingValue(entries[idx].value)
  }

  const confirmEdit = async () => {
    if (editingRowIdx === null) return
    const updated = entries.map((e, i) =>
      i === editingRowIdx ? { ...e, value: editingValue } : e
    )
    setEditingRowIdx(null)
    await saveFile(updated)
  }

  const cancelEdit = () => {
    setEditingRowIdx(null)
    setEditingValue('')
  }

  // ── Delete entry ──────────────────────────────────────────────────────────
  const deleteEntry = async (idx: number) => {
    const updated = entries.filter((_, i) => i !== idx)
    await saveFile(updated)
  }

  // ── Add entry ─────────────────────────────────────────────────────────────
  const confirmAddRow = async () => {
    const k = newKey.trim()
    const v = newValue.trim()
    if (!k) {
      setAddRowError('Key is required')
      return
    }
    if (entries.some(e => e.key === k)) {
      setAddRowError('Key already exists')
      return
    }
    const updated = [...entries, { key: k, value: v }]
    setShowAddRow(false)
    setNewKey('')
    setNewValue('')
    setAddRowError('')
    await saveFile(updated)
  }

  // ── Export file as CSV ────────────────────────────────────────────────────
  const exportCsv = async (file: CdbListFile) => {
    try {
      const res = await iocListApi.getListFileContent(file.filename, orgId)
      const raw: string = res?.data?.content ?? ''
      const parsed = parseCdb(raw)
      const csv = ['key,value', ...parsed.map(e => `${e.key},${e.value}`)].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to export')
    }
  }

  // ── Export current edit view as CSV ───────────────────────────────────────
  const exportCurrentCsv = () => {
    if (!editingFile) return
    const csv = ['key,value', ...entries.map(e => `${e.key},${e.value}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${editingFile.filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Delete file ───────────────────────────────────────────────────────────
  const confirmDeleteFile = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await iocListApi.deleteListFile(deleteTarget.filename, orgId)
      setDeleteTarget(null)
      showToast('success', `Deleted ${deleteTarget.filename}`)
      loadFiles()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  // ── CSV Import ────────────────────────────────────────────────────────────
  const parseCsvToEntries = (csvText: string): CdbEntry[] => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) return []
    // Skip header row if it looks like "key,value" or "Key,Value"
    const firstLower = lines[0].toLowerCase().replace(/\s/g, '')
    const startIdx = firstLower === 'key,value' || firstLower === 'keys,values' ? 1 : 0
    return lines.slice(startIdx).map(line => {
      const commaIdx = line.indexOf(',')
      if (commaIdx === -1) return { key: line.trim(), value: '' }
      return {
        key: line.substring(0, commaIdx).trim(),
        value: line.substring(commaIdx + 1).trim(),
      }
    }).filter(e => e.key.length > 0)
  }

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    // Reset input so same files can be re-selected
    e.target.value = ''

    setImporting(true)
    const results: { name: string; status: 'success' | 'error'; message?: string }[] = []

    for (const file of files) {
      const listName = file.name.replace(/\.csv$/i, '')
      if (!isValidFilename(listName)) {
        results.push({ name: file.name, status: 'error', message: 'Invalid filename — only letters, numbers, dots, hyphens, underscores allowed' })
        continue
      }
      try {
        const text = await file.text()
        const entries = parseCsvToEntries(text)
        const content = serializeCdb(entries)
        await iocListApi.saveListFile(listName, content, orgId)
        results.push({ name: listName, status: 'success', message: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` })
      } catch (err: unknown) {
        results.push({ name: listName, status: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
      }
    }

    setImporting(false)
    setImportResults(results)
    setShowImportResults(true)
    if (results.some(r => r.status === 'success')) loadFiles()
  }

  // ── Append CSV to current edit file ──────────────────────────────────────
  const handleAppendCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editingFile) return

    setAppending(true)
    try {
      const text = await file.text()
      const incoming = parseCsvToEntries(text)
      if (incoming.length === 0) {
        showToast('error', 'CSV file is empty or has no valid rows')
        return
      }
      // Merge: keep existing, append only keys not already present
      const existingKeys = new Set(entries.map(e => e.key))
      const newRows = incoming.filter(e => !existingKeys.has(e.key))
      const skipped = incoming.length - newRows.length
      const merged = [...entries, ...newRows]
      await saveFile(merged)
      const msg = skipped > 0
        ? `Appended ${newRows.length} entries (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)`
        : `Appended ${newRows.length} entries`
      showToast('success', msg)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to import CSV')
    } finally {
      setAppending(false)
    }
  }

  // ── Inline create helpers ────────────────────────────────────────────────
  const isValidFilename = (name: string) => /^[a-zA-Z0-9._-]+$/.test(name)

  const cancelInlineCreate = () => {
    setShowInlineCreate(false)
    setNewListName('')
    setNewListNameError('')
    setNewEntries([])
  }

  const addNewEntry = () => {
    setNewEntries(prev => [...prev, { key: '', value: '' }])
  }

  const updateNewEntry = (idx: number, field: 'key' | 'value', val: string) => {
    setNewEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  const removeNewEntry = (idx: number) => {
    setNewEntries(prev => prev.filter((_, i) => i !== idx))
  }

  const confirmCreate = async () => {
    const name = newListName.trim()
    if (!name) { setNewListNameError('Name is required'); return }
    if (!isValidFilename(name)) {
      setNewListNameError('Only letters, numbers, dots, hyphens, and underscores — no spaces')
      return
    }
    setCreating(true)
    try {
      const validEntries = newEntries.filter(e => e.key.trim())
      const content = serializeCdb(validEntries)
      await iocListApi.saveListFile(name, content, orgId)
      cancelInlineCreate()
      showToast('success', `Created ${name}`)
      loadFiles()
    } catch (err: unknown) {
      setNewListNameError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  // ── Filter + sort (alphabetical by filename, matching Wazuh order) ─────────
  const filteredFiles = files
    .filter(f => f.filename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.filename.localeCompare(b.filename))

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'edit' && editingFile) {
    return (
      <div className="p-6 space-y-5">
        {/* Toast */}
        {toast && (
          <div className={clsx(
            'fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          )}>
            {toast.type === 'success'
              ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              : <ExclamationCircleIcon className="w-4 h-4 text-red-500" />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('main'); setEditingFile(null) }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Back to IOC Lists
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {editingFile.filename}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden single-file input for append import */}
            <input
              ref={appendInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleAppendCsv}
            />
            <button
              onClick={() => appendInputRef.current?.click()}
              disabled={appending || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
              title="Import a CSV file and append entries to this list"
            >
              <ArrowUpTrayIcon className={clsx('w-4 h-4', appending && 'animate-pulse')} />
              {appending ? 'Appending…' : 'Import CSV'}
            </button>
            <button
              onClick={exportCurrentCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => { setShowAddRow(true); setNewKey(''); setNewValue(''); setAddRowError('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Path info */}
        <p className="text-xs text-gray-400">
          Path: {editingFile.relative_dirname}
        </p>

        {/* Loading / Error */}
        {loadingContent && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin mr-2" />
            Loading content…
          </div>
        )}
        {contentError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {contentError}
          </div>
        )}

        {/* Add Entry Row */}
        {showAddRow && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 space-y-3">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">New Entry</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-gray-500">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={e => { setNewKey(e.target.value); setAddRowError('') }}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-gray-500">Value</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="e.g. malicious (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {addRowError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <ExclamationCircleIcon className="w-3.5 h-3.5" />
                {addRowError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmAddRow}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddRow(false); setAddRowError('') }}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entries Table */}
        {!loadingContent && !contentError && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <DocumentTextIcon className="w-10 h-10 opacity-40" />
                <p className="text-sm">No entries found. Add one to get started.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-2/5">Key</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Value</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Key — read-only */}
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                        {entry.key}
                      </td>
                      {/* Value — editable inline */}
                      <td className="px-5 py-3">
                        {editingRowIdx === idx ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEdit()
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            />
                            <button
                              onClick={confirmEdit}
                              disabled={saving}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors"
                              title="Save"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Cancel"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        {editingRowIdx !== idx && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => startEdit(idx)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit value"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(idx)}
                              disabled={saving}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                              title="Delete entry"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Entry count */}
        {!loadingContent && !contentError && entries.length > 0 && (
          <p className="text-xs text-gray-400 text-right">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        )}>
          {toast.type === 'success'
            ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
            : <ExclamationCircleIcon className="w-4 h-4 text-red-500" />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IOC List</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage CYB CDB lists for indicator-of-compromise lookups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            disabled={loadingFiles}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={clsx('w-4 h-4', loadingFiles && 'animate-spin')} />
          </button>
          {/* Hidden file input for CSV import */}
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={handleImportFiles}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50"
            title="Select one or more CSV files to import as IOC lists"
          >
            <ArrowUpTrayIcon className={clsx('w-4 h-4', importing && 'animate-pulse')} />
            {importing ? 'Importing…' : 'Import Files'}
          </button>
          {!showInlineCreate && (
            <button
              onClick={() => { setShowInlineCreate(true); setNewListName(''); setNewListNameError(''); setNewEntries([]) }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>
      </div>

      {/* ── Inline Create Form ──────────────────────────────────────────── */}
      {showInlineCreate && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10 overflow-hidden">
          {/* Name row */}
          <div className="flex items-start gap-3 px-4 py-3 border-b border-blue-100 dark:border-blue-800/50 flex-wrap">
            {/* List name */}
            <div className="flex-1 min-w-44 space-y-1">
              <label className="text-xs font-medium text-blue-700 dark:text-blue-400">Name</label>
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={e => { setNewListName(e.target.value); setNewListNameError('') }}
                onKeyDown={e => e.key === 'Escape' && cancelInlineCreate()}
                placeholder="New IOC List Name"
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border',
                  newListNameError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {newListNameError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {newListNameError}
                </p>
              )}
              <p className="text-xs text-blue-400">Saved to: <span className="font-medium font-mono">etc/lists</span></p>
            </div>

            <div className="flex items-center gap-2 self-end pb-0.5">
              <button
                onClick={addNewEntry}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Entry
              </button>
              <button
                onClick={confirmCreate}
                disabled={creating}
                className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {creating ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelInlineCreate}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Cancel"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Entry rows */}
          {newEntries.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-100/60 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50">
                  <th className="text-left px-4 py-2 font-medium text-blue-700 dark:text-blue-400 w-2/5">Key</th>
                  <th className="text-left px-4 py-2 font-medium text-blue-700 dark:text-blue-400">Value</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 dark:divide-blue-800/40">
                {newEntries.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={entry.key}
                        onChange={e => updateNewEntry(idx, 'key', e.target.value)}
                        placeholder="Key"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={entry.value}
                        onChange={e => updateNewEntry(idx, 'value', e.target.value)}
                        placeholder="Value (optional)"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeNewEntry(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {newEntries.length === 0 && (
            <p className="px-4 py-3 text-xs text-blue-500 dark:text-blue-400">
              Click <span className="font-medium">Add Entry</span> to add key-value pairs, or save now to create an empty list.
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lists…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {filesError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
          {filesError}
        </div>
      )}

      {/* Loading */}
      {loadingFiles && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <ArrowPathIcon className="w-6 h-6 animate-spin mr-2" />
          Loading IOC lists…
        </div>
      )}

      {/* Files Table */}
      {!loadingFiles && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <DocumentTextIcon className="w-12 h-12 opacity-30" />
              <p className="text-sm">
                {search ? 'No lists match your search.' : 'No IOC lists found.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Path</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredFiles.map(file => (
                  <tr key={file.filename} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {file.filename}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                      {file.relative_dirname}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(file)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportCsv(file)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="Export as CSV"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* File count */}
      {!loadingFiles && filteredFiles.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filteredFiles.length} {filteredFiles.length === 1 ? 'list' : 'lists'}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* ── Import Results Modal ─────────────────────────────────────────── */}
      {showImportResults && importResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Import Results</h2>
              <button onClick={() => setShowImportResults(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {importResults.map((r, i) => (
                <li key={i} className={clsx(
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm',
                  r.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                )}>
                  {r.status === 'success'
                    ? <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                    : <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    {r.message && <p className="text-xs opacity-75 mt-0.5">{r.message}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs text-gray-400">
                {importResults.filter(r => r.status === 'success').length} of {importResults.length} imported successfully
              </p>
              <button
                onClick={() => setShowImportResults(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Delete IOC List</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-800 dark:text-gray-200">{deleteTarget.filename}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
