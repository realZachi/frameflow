import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { getFontEmbedCSS, toBlob } from 'html-to-image'
import JSZip from 'jszip'
import type { Slide } from '../types'
import { downloadBlob } from '../utils'
import { EXPORT_ARTBOARD_WIDTH, type ExportFormat } from './export-formats'

type SlideExportOptions = {
  slides: Slide[]
  projectName: string
  clearSelection: () => void
  setToast: Dispatch<SetStateAction<string | null>>
}

const getSafeFilename = (name: string, fallback: string) =>
  name.replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-|-$/g, '') || fallback

export function useSlideExport({
  slides,
  projectName,
  clearSelection,
  setToast,
}: SlideExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportAll = useCallback(async (format: ExportFormat) => {
    if (exporting) return

    setExporting(true)
    setExportProgress(0)
    clearSelection()
    try {
      await document.fonts.ready
      await new Promise((resolve) => window.setTimeout(resolve, 120))
      const zip = new JSZip()
      const firstSlide = slides[0]
      const firstNode = firstSlide
        ? document.getElementById(`artboard-${firstSlide.id}`)
        : null
      const fontEmbedCSS = firstNode
        ? await getFontEmbedCSS(firstNode, { preferredFontFormat: 'woff2' })
        : null

      for (const [index, slide] of slides.entries()) {
        const node = document.getElementById(`artboard-${slide.id}`)
        if (!node) continue
        const blob = await toBlob(node, {
          pixelRatio: 1,
          width: EXPORT_ARTBOARD_WIDTH,
          height: EXPORT_ARTBOARD_WIDTH * format.height / format.width,
          canvasWidth: format.width,
          canvasHeight: format.height,
          backgroundColor: slide.background.color1,
          ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
          preferredFontFormat: 'woff2',
          filter: (candidate) =>
            !(candidate instanceof HTMLElement && candidate.dataset.aiOverlay),
        })
        if (!blob) throw new Error(`Screen ${index + 1} konnte nicht gerendert werden`)

        const filename = getSafeFilename(slide.name, `Screen-${index + 1}`)
        zip.file(`${String(index + 1).padStart(2, '0')}-${filename}.png`, blob)
        setExportProgress(Math.round(((index + 1) / slides.length) * 100))
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })
      const projectFilename = getSafeFilename(projectName.trim(), 'Frameflow')
      downloadBlob(blob, `${projectFilename}-${format.filename}-Screens.zip`)
      setToast(`${slides.length} PNGs für ${format.label} als ZIP exportiert`)
    } catch (error) {
      console.error(error)
      setToast('Export fehlgeschlagen – bitte erneut versuchen')
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }, [clearSelection, exporting, projectName, setToast, slides])

  return { exporting, exportProgress, exportAll }
}
