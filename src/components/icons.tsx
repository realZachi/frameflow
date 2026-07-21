import type { ComponentProps } from 'react'
import {
  AlignCenter as AlignCenterIcon,
  AlignLeft as AlignLeftIcon,
  AlignRight as AlignRightIcon,
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  Blend as BlendIcon,
  Bold as BoldIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Cloud as CloudIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  ImagePlus as ImagePlusIcon,
  Italic as ItalicIcon,
  Layers as Layers3Icon,
  Lock as LockIcon,
  LockKeyhole as LockKeyholeIcon,
  LockOpen as LockOpenIcon,
  Minus as MinusIcon,
  MonitorSmartphone as MonitorSmartphoneIcon,
  Palette as PaletteIcon,
  Plus as PlusIcon,
  Redo2 as Redo2Icon,
  Shapes as ShapesIcon,
  Share2 as Share2Icon,
  Sparkles as SparklesIcon,
  Strikethrough as StrikethroughIcon,
  Trash2 as Trash2Icon,
  Type as TypeIcon,
  Underline as UnderlineIcon,
  Undo2 as Undo2Icon,
  Upload as UploadIcon,
  X as XIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>

const createIcon = (icon: IconSvgElement) => (props: IconProps) => (
  <HugeiconsIcon icon={icon} {...props} />
)

export const AlignCenter = createIcon(AlignCenterIcon)
export const AlignLeft = createIcon(AlignLeftIcon)
export const AlignRight = createIcon(AlignRightIcon)
export const ArrowDown = createIcon(ArrowDownIcon)
export const ArrowUp = createIcon(ArrowUpIcon)
export const Blend = createIcon(BlendIcon)
export const Bold = createIcon(BoldIcon)
export const Check = createIcon(CheckIcon)
export const ChevronDown = createIcon(ChevronDownIcon)
export const ChevronLeft = createIcon(ChevronLeftIcon)
export const ChevronRight = createIcon(ChevronRightIcon)
export const Cloud = createIcon(CloudIcon)
export const Copy = createIcon(CopyIcon)
export const Download = createIcon(DownloadIcon)
export const ImagePlus = createIcon(ImagePlusIcon)
export const Italic = createIcon(ItalicIcon)
export const Layers3 = createIcon(Layers3Icon)
export const Lock = createIcon(LockIcon)
export const LockKeyhole = createIcon(LockKeyholeIcon)
export const LockOpen = createIcon(LockOpenIcon)
export const Minus = createIcon(MinusIcon)
export const MonitorSmartphone = createIcon(MonitorSmartphoneIcon)
export const Palette = createIcon(PaletteIcon)
export const Plus = createIcon(PlusIcon)
export const Redo2 = createIcon(Redo2Icon)
export const Shapes = createIcon(ShapesIcon)
export const Share2 = createIcon(Share2Icon)
export const Sparkles = createIcon(SparklesIcon)
export const Strikethrough = createIcon(StrikethroughIcon)
export const Trash2 = createIcon(Trash2Icon)
export const Type = createIcon(TypeIcon)
export const Underline = createIcon(UnderlineIcon)
export const Undo2 = createIcon(Undo2Icon)
export const Upload = createIcon(UploadIcon)
export const X = createIcon(XIcon)
