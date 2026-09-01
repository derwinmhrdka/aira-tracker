'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import type { VaccineCatalogItem, VaccineStrategySettings } from '@/lib/api-client'
import {
  catalogMidPrice,
  formatIdrInput,
  getCatalogVaccineLabel,
  getMergedCatalog,
  parseIdrInput,
} from '@/lib/vaccine-strategy'

type VaccineStrategySettingsSheetProps = {
  open: boolean
  strategy: VaccineStrategySettings
  onClose: () => void
  onSave: (data: {
    catalog_prices?: Record<string, number>
    custom_catalog?: VaccineCatalogItem[]
  }) => Promise<void>
}

export function VaccineStrategySettingsSheet({
  open,
  strategy,
  onClose,
  onSave,
}: VaccineStrategySettingsSheetProps) {
  const [priceDisplays, setPriceDisplays] = useState<Record<string, string>>({})
  const [customCatalog, setCustomCatalog] = useState<VaccineCatalogItem[]>([])
  const [newName, setNewName] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [newIsBasic, setNewIsBasic] = useState(false)
  const [newAtPuskesmas, setNewAtPuskesmas] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCustomCatalog(strategy.customCatalog ?? [])
    setNewName('')
    setNewBrand('')
    setNewKeywords('')
    setNewIsBasic(false)
    setNewAtPuskesmas(false)
    setNewPrice('')

    const prices: Record<string, string> = {}
    for (const item of getMergedCatalog(strategy)) {
      const saved = strategy.catalogPrices?.[item.id]
      const n = saved != null ? saved : catalogMidPrice(item)
      prices[item.id] = formatIdrInput(n)
    }
    setPriceDisplays(prices)
  }, [open, strategy])

  const handlePriceChange = (id: string, raw: string) => {
    const n = parseIdrInput(raw)
    setPriceDisplays((prev) => ({
      ...prev,
      [id]: n > 0 ? formatIdrInput(n) : '',
    }))
  }

  const addCustomItem = () => {
    if (!newName.trim() || !newKeywords.trim()) return
    const id = `custom-${Date.now()}`
    const price = parseIdrInput(newPrice)
    setCustomCatalog((prev) => [
      ...prev,
      {
        id,
        name: newName.trim(),
        brand: newBrand.trim() || undefined,
        matchKeywords: newKeywords.trim(),
        priceMinIdr: price,
        priceMaxIdr: price,
        isBasic: newIsBasic,
        atPuskesmas: newAtPuskesmas,
        isCustom: true,
      },
    ])
    setPriceDisplays((prev) => ({
      ...prev,
      [id]: price > 0 ? formatIdrInput(price) : '',
    }))
    setNewName('')
    setNewBrand('')
    setNewKeywords('')
    setNewIsBasic(false)
    setNewAtPuskesmas(false)
    setNewPrice('')
  }

  if (typeof window === 'undefined') return null

  const mergedCatalog = getMergedCatalog({ customCatalog })

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[90vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-1 font-heading text-base font-bold text-foreground">
              Pengaturan vaksin
            </h2>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Harga referensi untuk estimasi di plan. Tempat dan dokter diisi per plan.
            </p>
            <div className="space-y-2.5">
              <div>
                <p className="mb-2 text-xs font-medium text-foreground">Jenis vaksin & harga</p>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
                  {mergedCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {item.brand ? `${item.name} · ${item.brand}` : item.name}
                          {item.isCustom ? (
                            <span className="ml-1 text-[9px] text-primary">custom</span>
                          ) : null}
                        </p>
                        {item.isCustom ? (
                          <input
                            value={item.matchKeywords ?? ''}
                            onChange={(e) =>
                              setCustomCatalog((prev) =>
                                prev.map((c) =>
                                  c.id === item.id
                                    ? { ...c, matchKeywords: e.target.value }
                                    : c
                                )
                              )
                            }
                            placeholder="Kata kunci vaksin (koma)"
                            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-[10px]"
                          />
                        ) : (
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            Vaksin: {getCatalogVaccineLabel(item)}
                          </p>
                        )}
                      </div>
                      <div className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                          Rp
                        </span>
                        <input
                          inputMode="numeric"
                          value={priceDisplays[item.id] ?? ''}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-full rounded-md border border-input bg-background py-1.5 pl-6 pr-1 text-[11px] tabular-nums"
                        />
                      </div>
                      {item.isCustom ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCustomCatalog((prev) => prev.filter((c) => c.id !== item.id))
                          }
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                          aria-label="Hapus jenis"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Tambah jenis vaksin
                  </p>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama jenis"
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Produk / merek (opsional)"
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <input
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="Vaksin jadwal (kata kunci, pisah koma)"
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-3 text-[11px]">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={newIsBasic}
                        onChange={(e) => setNewIsBasic(e.target.checked)}
                      />
                      Dasar
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={newAtPuskesmas}
                        onChange={(e) => setNewAtPuskesmas(e.target.checked)}
                      />
                      Puskesmas
                    </label>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      Rp
                    </span>
                    <input
                      inputMode="numeric"
                      value={newPrice}
                      onChange={(e) => {
                        const n = parseIdrInput(e.target.value)
                        setNewPrice(n > 0 ? formatIdrInput(n) : '')
                      }}
                      placeholder="Harga"
                      className="w-full rounded-lg border border-input bg-background py-1.5 pl-7 pr-2 text-sm tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    disabled={!newName.trim() || !newKeywords.trim()}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-secondary py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah jenis
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    const catalog_prices: Record<string, number> = {}
                    for (const item of mergedCatalog) {
                      const n = parseIdrInput(priceDisplays[item.id] ?? '')
                      catalog_prices[item.id] = n > 0 ? n : catalogMidPrice(item)
                    }
                    await onSave({
                      catalog_prices,
                      custom_catalog: customCatalog,
                    })
                    onClose()
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Simpan'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
