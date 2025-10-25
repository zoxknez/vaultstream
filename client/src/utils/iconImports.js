/**
 * 🎨 STREAMVAULT ICON IMPORTS
 * Optimized icon imports for better performance
 */

// Import only the icons we actually use
import {
  AlertCircle,
  Archive,
  Battery,
  BatteryLow,
  Bluetooth,
  BluetoothOff,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  Cpu,
  Database,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Filter,
  Folder,
  Grid,
  HardDrive,
  HardDriveOff,
  Headphones,
  Heart,
  HelpCircle,
  Home,
  Image,
  Info,
  Key,
  KeyOff,
  Layout,
  Link,
  List,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Maximize,
  Memory,
  Menu,
  Mic,
  MicOff,
  Minimize,
  Minus,
  Monitor,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldOff,
  Signal,
  SignalOff,
  Smartphone,
  SortAsc,
  SortDesc,
  Star,
  Tablet,
  Tag,
  Trash2,
  Unlock,
  Upload,
  User,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  XCircle,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Create optimized icon components
export const Icons = {
  // Media controls
  Play: Play,
  Pause: Pause,
  Volume2: Volume2,
  VolumeX: VolumeX,
  Maximize: Maximize,
  Minimize: Minimize,

  // Navigation
  Home: Home,
  User: User,
  LogOut: LogOut,
  LogIn: LogIn,
  Menu: Menu,
  X: X,

  // Arrows
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,
  ChevronUp: ChevronUp,
  ChevronDown: ChevronDown,

  // Actions
  Download: Download,
  Share2: Share2,
  Heart: Heart,
  Star: Star,
  Search: Search,
  Settings: Settings,

  // Visibility
  Eye: Eye,
  EyeOff: EyeOff,
  Lock: Lock,
  Unlock: Unlock,

  // Communication
  Mail: Mail,
  Phone: Phone,
  MapPin: MapPin,
  Calendar: Calendar,
  Clock: Clock,

  // Content
  Tag: Tag,
  Filter: Filter,
  SortAsc: SortAsc,
  SortDesc: SortDesc,

  // Controls
  RefreshCw: RefreshCw,
  RotateCcw: RotateCcw,
  RotateCw: RotateCw,
  ZoomIn: ZoomIn,
  ZoomOut: ZoomOut,
  Move: Move,

  // File operations
  Copy: Copy,
  Trash2: Trash2,
  Edit: Edit,
  Save: Save,
  Upload: Upload,

  // File types
  FileText: FileText,
  Image: Image,
  Video: Video,
  Music: Music,
  Archive: Archive,
  Folder: Folder,
  File: File,

  // Links
  Link: Link,
  ExternalLink: ExternalLink,

  // Status
  Info: Info,
  AlertCircle: AlertCircle,
  CheckCircle: CheckCircle,
  XCircle: XCircle,
  HelpCircle: HelpCircle,

  // Math
  Plus: Plus,
  Minus: Minus,

  // More options
  MoreHorizontal: MoreHorizontal,
  MoreVertical: MoreVertical,

  // Layout
  Grid: Grid,
  List: List,
  Layout: Layout,

  // Devices
  Monitor: Monitor,
  Smartphone: Smartphone,
  Tablet: Tablet,

  // Connectivity
  Wifi: Wifi,
  WifiOff: WifiOff,
  Bluetooth: Bluetooth,
  BluetoothOff: BluetoothOff,

  // Power
  Battery: Battery,
  BatteryLow: BatteryLow,

  // Signal
  Signal: Signal,
  SignalOff: SignalOff,

  // Audio/Video
  Headphones: Headphones,
  Mic: Mic,
  MicOff: MicOff,
  Camera: Camera,
  CameraOff: CameraOff,

  // Security
  Shield: Shield,
  ShieldOff: ShieldOff,
  Key: Key,
  KeyOff: KeyOff,

  // Storage
  Database: Database,
  Server: Server,
  Cloud: Cloud,
  CloudOff: CloudOff,
  HardDrive: HardDrive,
  HardDriveOff: HardDriveOff,

  // Hardware
  Cpu: Cpu,
  Memory: Memory
};

// Create icon registry for dynamic imports
export const IconRegistry = new Map([
  ['play', Play],
  ['pause', Pause],
  ['volume2', Volume2],
  ['volume-x', VolumeX],
  ['maximize', Maximize],
  ['minimize', Minimize],
  ['home', Home],
  ['user', User],
  ['log-out', LogOut],
  ['log-in', LogIn],
  ['menu', Menu],
  ['x', X],
  ['chevron-left', ChevronLeft],
  ['chevron-right', ChevronRight],
  ['chevron-up', ChevronUp],
  ['chevron-down', ChevronDown],
  ['download', Download],
  ['share-2', Share2],
  ['heart', Heart],
  ['star', Star],
  ['search', Search],
  ['settings', Settings],
  ['eye', Eye],
  ['eye-off', EyeOff],
  ['lock', Lock],
  ['unlock', Unlock],
  ['mail', Mail],
  ['phone', Phone],
  ['map-pin', MapPin],
  ['calendar', Calendar],
  ['clock', Clock],
  ['tag', Tag],
  ['filter', Filter],
  ['sort-asc', SortAsc],
  ['sort-desc', SortDesc],
  ['refresh-cw', RefreshCw],
  ['rotate-ccw', RotateCcw],
  ['rotate-cw', RotateCw],
  ['zoom-in', ZoomIn],
  ['zoom-out', ZoomOut],
  ['move', Move],
  ['copy', Copy],
  ['trash-2', Trash2],
  ['edit', Edit],
  ['save', Save],
  ['upload', Upload],
  ['file-text', FileText],
  ['image', Image],
  ['video', Video],
  ['music', Music],
  ['archive', Archive],
  ['folder', Folder],
  ['file', File],
  ['link', Link],
  ['external-link', ExternalLink],
  ['info', Info],
  ['alert-circle', AlertCircle],
  ['check-circle', CheckCircle],
  ['x-circle', XCircle],
  ['help-circle', HelpCircle],
  ['plus', Plus],
  ['minus', Minus],
  ['more-horizontal', MoreHorizontal],
  ['more-vertical', MoreVertical],
  ['grid', Grid],
  ['list', List],
  ['layout', Layout],
  ['monitor', Monitor],
  ['smartphone', Smartphone],
  ['tablet', Tablet],
  ['wifi', Wifi],
  ['wifi-off', WifiOff],
  ['bluetooth', Bluetooth],
  ['bluetooth-off', BluetoothOff],
  ['battery', Battery],
  ['battery-low', BatteryLow],
  ['signal', Signal],
  ['signal-off', SignalOff],
  ['headphones', Headphones],
  ['mic', Mic],
  ['mic-off', MicOff],
  ['camera', Camera],
  ['camera-off', CameraOff],
  ['shield', Shield],
  ['shield-off', ShieldOff],
  ['key', Key],
  ['key-off', KeyOff],
  ['database', Database],
  ['server', Server],
  ['cloud', Cloud],
  ['cloud-off', CloudOff],
  ['hard-drive', HardDrive],
  ['hard-drive-off', HardDriveOff],
  ['cpu', Cpu],
  ['memory', Memory]
]);

/**
 * Get icon component by name
 */
export const getIcon = (name) => {
  return IconRegistry.get(name) || null;
};

/**
 * Check if icon exists
 */
export const hasIcon = (name) => {
  return IconRegistry.has(name);
};

/**
 * Get all available icon names
 */
export const getAvailableIcons = () => {
  return Array.from(IconRegistry.keys());
};

/**
 * Create optimized icon component
 */
export const createIconComponent = (name) => {
  const IconComponent = getIcon(name);

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return IconComponent;
};

/**
 * Preload icons for better performance
 */
export const preloadIcons = (iconNames) => {
  iconNames.forEach((name) => {
    if (hasIcon(name)) {
      // Preload icon component
      const IconComponent = getIcon(name);
      if (IconComponent) {
        // Create a dummy instance to trigger module loading
        try {
          new IconComponent();
        } catch {
          // Ignore errors, we just want to trigger the import
        }
      }
    }
  });
};

/**
 * Get icon bundle size
 */
export const getIconBundleSize = () => {
  // This would be calculated based on actual bundle analysis
  // For now, return estimated sizes
  return {
    totalIcons: IconRegistry.size,
    estimatedSize: IconRegistry.size * 2.5, // KB
    compressionRatio: 0.7,
    compressedSize: IconRegistry.size * 2.5 * 0.7
  };
};

/**
 * Optimize icon imports
 */
export const optimizeIconImports = () => {
  // Remove unused icons from bundle
  const usedIcons = new Set();

  // This would be implemented with actual code scanning
  // For now, return optimization suggestions
  return {
    usedIcons: Array.from(usedIcons),
    unusedIcons: Array.from(IconRegistry.keys()).filter((name) => !usedIcons.has(name)),
    optimizationScore: (usedIcons.size / IconRegistry.size) * 100
  };
};

export default Icons;
