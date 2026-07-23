import {
  AlarmClockIcon,
  AlertCircleIcon,
  AnalyticsUpIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  BadgeCheckIcon,
  BanIcon,
  BarChartIcon,
  BellIcon,
  BulbIcon,
  Calendar01Icon,
  CallIcon,
  Cancel01Icon,
  CancelCircleIcon,
  Camera01Icon,
  Certificate01Icon,
  Chat01Icon,
  Chart01Icon,
  CheckIcon,
  CheckmarkCircle01Icon,
  CloudIcon,
  Coins01Icon,
  CompassIcon,
  CrownIcon,
  Diamond01Icon,
  Dollar01Icon,
  Download01Icon,
  DropletIcon,
  Edit01Icon,
  Fire02Icon,
  Flag01Icon,
  FlashIcon,
  GiftIcon,
  Globe02Icon,
  HeadphonesIcon,
  HelpCircleIcon,
  HeartIcon,
  Home01Icon,
  Image01Icon,
  InformationCircleIcon,
  Key01Icon,
  Leaf01Icon,
  Location01Icon,
  LockIcon,
  Mail01Icon,
  MapPinIcon,
  Medal01Icon,
  Message01Icon,
  Mic01Icon,
  MoonIcon,
  MusicNote01Icon,
  NavigationIcon,
  Notification01Icon,
  Pen01Icon,
  PercentIcon,
  PieChartIcon,
  PlayIcon,
  PowerOffIcon,
  Rocket01Icon,
  Route01Icon,
  Search01Icon,
  Settings01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  SmileIcon,
  SnowIcon,
  SparklesIcon,
  StarIcon,
  StopWatchIcon,
  Store01Icon,
  Sun01Icon,
  Tag01Icon,
  Target01Icon,
  TelephoneIcon,
  ThumbsUpIcon,
  Timer01Icon,
  Video01Icon,
  ViewIcon,
  Wallet01Icon,
  Wifi01Icon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

export type IconGroupId =
  | 'Status'
  | 'Social Proof'
  | 'Arrows'
  | 'Communication'
  | 'Media'
  | 'Business'
  | 'Security'
  | 'Time & Location'
  | 'Nature'
  | 'Accent'

export type IconCatalogEntry = {
  id: string
  label: string
  group: IconGroupId
  icon: IconSvgElement
}

export const iconCatalog: IconCatalogEntry[] = [
  // Status
  { id: 'check', label: 'Check', group: 'Status', icon: CheckIcon },
  { id: 'check-circle', label: 'Check circle', group: 'Status', icon: CheckmarkCircle01Icon },
  { id: 'cancel', label: 'Cancel', group: 'Status', icon: Cancel01Icon },
  { id: 'cancel-circle', label: 'Cancel circle', group: 'Status', icon: CancelCircleIcon },
  { id: 'alert', label: 'Alert', group: 'Status', icon: AlertCircleIcon },
  { id: 'info', label: 'Info', group: 'Status', icon: InformationCircleIcon },
  { id: 'help', label: 'Help', group: 'Status', icon: HelpCircleIcon },
  { id: 'ban', label: 'Ban', group: 'Status', icon: BanIcon },

  // Social Proof
  { id: 'star', label: 'Star', group: 'Social Proof', icon: StarIcon },
  { id: 'heart', label: 'Heart', group: 'Social Proof', icon: HeartIcon },
  { id: 'thumbs-up', label: 'Thumbs up', group: 'Social Proof', icon: ThumbsUpIcon },
  { id: 'smile', label: 'Smile', group: 'Social Proof', icon: SmileIcon },
  { id: 'award', label: 'Award', group: 'Social Proof', icon: Award01Icon },
  { id: 'medal', label: 'Medal', group: 'Social Proof', icon: Medal01Icon },
  { id: 'crown', label: 'Crown', group: 'Social Proof', icon: CrownIcon },
  { id: 'badge-check', label: 'Verified', group: 'Social Proof', icon: BadgeCheckIcon },
  { id: 'certificate', label: 'Certificate', group: 'Social Proof', icon: Certificate01Icon },

  // Arrows
  { id: 'arrow-up', label: 'Arrow up', group: 'Arrows', icon: ArrowUp01Icon },
  { id: 'arrow-right', label: 'Arrow right', group: 'Arrows', icon: ArrowRight01Icon },
  { id: 'arrow-down', label: 'Arrow down', group: 'Arrows', icon: ArrowDown01Icon },
  { id: 'arrow-left', label: 'Arrow left', group: 'Arrows', icon: ArrowLeft01Icon },
  { id: 'arrow-up-right', label: 'Arrow diagonal', group: 'Arrows', icon: ArrowUpRight01Icon },
  { id: 'compass', label: 'Compass', group: 'Arrows', icon: CompassIcon },
  { id: 'navigation', label: 'Navigation', group: 'Arrows', icon: NavigationIcon },

  // Communication
  { id: 'bell', label: 'Bell', group: 'Communication', icon: BellIcon },
  { id: 'mail', label: 'Mail', group: 'Communication', icon: Mail01Icon },
  { id: 'message', label: 'Message', group: 'Communication', icon: Message01Icon },
  { id: 'chat', label: 'Chat', group: 'Communication', icon: Chat01Icon },
  { id: 'notification', label: 'Notification', group: 'Communication', icon: Notification01Icon },
  { id: 'phone', label: 'Phone', group: 'Communication', icon: TelephoneIcon },
  { id: 'call', label: 'Call', group: 'Communication', icon: CallIcon },

  // Media
  { id: 'camera', label: 'Camera', group: 'Media', icon: Camera01Icon },
  { id: 'image', label: 'Image', group: 'Media', icon: Image01Icon },
  { id: 'play', label: 'Play', group: 'Media', icon: PlayIcon },
  { id: 'video', label: 'Video', group: 'Media', icon: Video01Icon },
  { id: 'music', label: 'Music', group: 'Media', icon: MusicNote01Icon },
  { id: 'mic', label: 'Microphone', group: 'Media', icon: Mic01Icon },
  { id: 'headphones', label: 'Headphones', group: 'Media', icon: HeadphonesIcon },
  { id: 'view', label: 'View', group: 'Media', icon: ViewIcon },
  { id: 'pen', label: 'Pen', group: 'Media', icon: Pen01Icon },
  { id: 'edit', label: 'Edit', group: 'Media', icon: Edit01Icon },

  // Business
  { id: 'chart', label: 'Chart', group: 'Business', icon: Chart01Icon },
  { id: 'bar-chart', label: 'Bar chart', group: 'Business', icon: BarChartIcon },
  { id: 'pie-chart', label: 'Pie chart', group: 'Business', icon: PieChartIcon },
  { id: 'analytics-up', label: 'Analytics up', group: 'Business', icon: AnalyticsUpIcon },
  { id: 'dollar', label: 'Dollar', group: 'Business', icon: Dollar01Icon },
  { id: 'percent', label: 'Percent', group: 'Business', icon: PercentIcon },
  { id: 'wallet', label: 'Wallet', group: 'Business', icon: Wallet01Icon },
  { id: 'coins', label: 'Coins', group: 'Business', icon: Coins01Icon },
  { id: 'shopping-bag', label: 'Shopping bag', group: 'Business', icon: ShoppingBag01Icon },
  { id: 'cart', label: 'Cart', group: 'Business', icon: ShoppingCart01Icon },
  { id: 'store', label: 'Store', group: 'Business', icon: Store01Icon },
  { id: 'tag', label: 'Tag', group: 'Business', icon: Tag01Icon },

  // Security
  { id: 'lock', label: 'Lock', group: 'Security', icon: LockIcon },
  { id: 'shield', label: 'Shield', group: 'Security', icon: Shield01Icon },
  { id: 'key', label: 'Key', group: 'Security', icon: Key01Icon },
  { id: 'cloud', label: 'Cloud', group: 'Security', icon: CloudIcon },
  { id: 'download', label: 'Download', group: 'Security', icon: Download01Icon },
  { id: 'wifi', label: 'Wifi', group: 'Security', icon: Wifi01Icon },
  { id: 'power', label: 'Power', group: 'Security', icon: PowerOffIcon },

  // Time & Location
  { id: 'alarm', label: 'Alarm', group: 'Time & Location', icon: AlarmClockIcon },
  { id: 'stopwatch', label: 'Stopwatch', group: 'Time & Location', icon: StopWatchIcon },
  { id: 'timer', label: 'Timer', group: 'Time & Location', icon: Timer01Icon },
  { id: 'calendar', label: 'Calendar', group: 'Time & Location', icon: Calendar01Icon },
  { id: 'map-pin', label: 'Map pin', group: 'Time & Location', icon: MapPinIcon },
  { id: 'location', label: 'Location', group: 'Time & Location', icon: Location01Icon },
  { id: 'route', label: 'Route', group: 'Time & Location', icon: Route01Icon },

  // Nature
  { id: 'sun', label: 'Sun', group: 'Nature', icon: Sun01Icon },
  { id: 'moon', label: 'Moon', group: 'Nature', icon: MoonIcon },
  { id: 'leaf', label: 'Leaf', group: 'Nature', icon: Leaf01Icon },
  { id: 'snow', label: 'Snow', group: 'Nature', icon: SnowIcon },
  { id: 'droplet', label: 'Droplet', group: 'Nature', icon: DropletIcon },
  { id: 'fire', label: 'Fire', group: 'Nature', icon: Fire02Icon },
  { id: 'bulb', label: 'Lightbulb', group: 'Nature', icon: BulbIcon },

  // Accent
  { id: 'sparkles', label: 'Sparkles', group: 'Accent', icon: SparklesIcon },
  { id: 'zap', label: 'Zap', group: 'Accent', icon: ZapIcon },
  { id: 'flash', label: 'Flash', group: 'Accent', icon: FlashIcon },
  { id: 'rocket', label: 'Rocket', group: 'Accent', icon: Rocket01Icon },
  { id: 'target', label: 'Target', group: 'Accent', icon: Target01Icon },
  { id: 'globe', label: 'Globe', group: 'Accent', icon: Globe02Icon },
  { id: 'diamond', label: 'Diamond', group: 'Accent', icon: Diamond01Icon },
  { id: 'flag', label: 'Flag', group: 'Accent', icon: Flag01Icon },
  { id: 'gift', label: 'Gift', group: 'Accent', icon: GiftIcon },
  { id: 'search', label: 'Search', group: 'Accent', icon: Search01Icon },
  { id: 'settings', label: 'Settings', group: 'Accent', icon: Settings01Icon },
  { id: 'home', label: 'Home', group: 'Accent', icon: Home01Icon },
]

export const iconIds = iconCatalog.map((entry) => entry.id) as [string, ...string[]]

export const iconRegistry: Record<string, IconSvgElement> = Object.fromEntries(
  iconCatalog.map((entry) => [entry.id, entry.icon]),
)

export const iconGroups: IconGroupId[] = [
  'Status',
  'Social Proof',
  'Arrows',
  'Communication',
  'Media',
  'Business',
  'Security',
  'Time & Location',
  'Nature',
  'Accent',
]

export const getIcon = (id: string): IconSvgElement | undefined => iconRegistry[id]
