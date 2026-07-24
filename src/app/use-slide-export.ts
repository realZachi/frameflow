import { getFontEmbedCSS, toBlob } from 'html-to-image'
import JSZip from 'jszip'
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { downloadBlob } from '../utils'
import {
  EXPORT_ARTBOARD_WIDTH,
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportTarget,
} from './export-formats'
import {
  getExportZipDownloadName,
  getExportZipEntryPath,
} from './export-paths'
import type { Slide } from '../types'

type SlideExportOptions = {
  slides: Slide[]
  projectName: string
  clearSelection: () => void
  setToast: Dispatch<SetStateAction<string | null>>
}

async function renderSlidePng(
  slide: Slide,
  format: ExportFormat,
  fontEmbedCSS: string | null,
) {
  const node = document.getElementById(`artboard-${slide.id}`)
  if (!node) return null

  return toBlob(node, {
    pixelRatio: 1,
    width: EXPORT_ARTBOARD_WIDTH,
    height: EXPORT_ARTBOARD_WIDTH * format.height / format.width,
    canvasWidth: format.width,
    canvasHeight: format.height,
    backgroundColor: slide.background.color1,
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    filter: (candidate) =>
      !(candidate instanceof HTMLElement && candidate.dataset['aiOverlay']),
  })
}

export function useSlideExport({
  slides,
  projectName,
  clearSelection,
  setToast,
}: SlideExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportAll = useCallback(async (target: ExportTarget) => {
    if (exporting || slides.length === 0) return

    const formats = target === 'all' ? [...EXPORT_FORMATS] : [target]
    const nested = target === 'all'
    const total = slides.length * formats.length

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
        ? await getFontEmbedCSS(firstNode)
        : null

      let completed = 0
      for (const format of formats) {
        for (const [index, slide] of slides.entries()) {
          const blob = await renderSlidePng(slide, format, fontEmbedCSS)
          if (!blob) throw new Error(`Screen ${index + 1} couldn’t be rendered`)

          zip.file(
            getExportZipEntryPath(format.filename, index, slide.name, nested),
            blob,
          )
          completed += 1
          setExportProgress(Math.round((completed / total) * 100))
        }
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })
      const formatFilename = target === 'all' ? 'all-sizes' : target.filename
      downloadBlob(blob, getExportZipDownloadName(projectName, formatFilename))
      setToast(
        target === 'all'
          ? `Exported ${slides.length} PNGs in ${formats.length} size folders as a ZIP archive`
          : `Exported ${slides.length} PNGs for ${target.label} as a ZIP archive`,
      )
    } catch (error) {
      console.error(error)
      setToast('Export failed — please try again')
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }, [clearSelection, exporting, projectName, setToast, slides])

  return { exporting, exportProgress, exportAll }
}
