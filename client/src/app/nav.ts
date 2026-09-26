import {
  ArrowDownToLineIcon,
  ArrowLeftRightIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SlidersHorizontalIcon,
  TagsIcon,
  TriangleAlertIcon,
  TruckIcon,
  WarehouseIcon,
  MapPinIcon,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  to: string
  icon: LucideIcon
  /** Only match the exact path (used for the index route). */
  end?: boolean
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ title: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon }],
  },
  {
    title: 'Products',
    items: [
      { title: 'All Products', to: '/products', icon: PackageIcon },
      { title: 'Categories', to: '/products/categories', icon: TagsIcon },
      { title: 'Low Stock', to: '/alerts', icon: TriangleAlertIcon },
    ],
  },
  {
    title: 'Operations',
    items: [
      { title: 'Receipts', to: '/operations/receipts', icon: ArrowDownToLineIcon },
      { title: 'Delivery Orders', to: '/operations/deliveries', icon: TruckIcon },
      { title: 'Internal Transfers', to: '/operations/transfers', icon: ArrowLeftRightIcon },
      { title: 'Adjustments', to: '/operations/adjustments', icon: SlidersHorizontalIcon },
      { title: 'Move History', to: '/moves', icon: HistoryIcon },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'Warehouses', to: '/settings/warehouses', icon: WarehouseIcon },
      { title: 'Locations', to: '/settings/locations', icon: MapPinIcon },
    ],
  },
]
