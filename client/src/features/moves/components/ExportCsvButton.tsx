import { useState } from 'react'
import { DownloadIcon, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadCsv, fetchMovesForExport, movesToCsv } from '../csv'
import type { MoveFilters } from '../types'

export function ExportCsvButton({ filters }: { filters: MoveFilters }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const { rows, total } = await fetchMovesForExport(filters)
      if (rows.length === 0) {
        toast.error('There are no moves to export for these filters')
        return
      }
      downloadCsv(movesToCsv(rows))
      if (rows.length < total) toast.success(`Exported the first ${rows.length} of ${total} moves`)
      else toast.success(`Exported ${rows.length} moves`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button type="button" variant="outline" disabled={exporting} onClick={() => void handleExport()}>
      {exporting ? <LoaderCircleIcon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
      Export CSV
    </Button>
  )
}
