'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Siren,
  Inbox,
  BarChart3,
  Target,
  BadgeCheck,
  Database,
  Bot,
  Zap,
  ScrollText,
  Gavel,
  Fingerprint,
  Network,
  Briefcase,
  Cog,
  BookMarked,
  type LucideIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import { SystemStatus } from './system-status'
import { useClient } from '@/contexts/ClientContext'
import { getUserFromCookies } from '@/lib/auth'

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  badge: string | null
  requiredPermission: string
  category?: string
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedClient, isClientMode, setSelectedClient } = useClient()

  const getNavigationItems = (): NavItem[] => {
    if (isClientMode && !selectedClient) {
      return [
        { name: 'Client Overview', href: '/overview', icon: Briefcase, badge: null, requiredPermission: 'overview:read', category: 'Workspace' },
        { name: 'Settings', href: '/settings', icon: Cog, badge: null, requiredPermission: 'settings:access', category: 'Workspace' },
        { name: 'Playbooks & SOPs', href: '/playbooks-sops', icon: BookMarked, badge: null, requiredPermission: 'sops:read', category: 'Workspace' },
      ]
    }

    return [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null, requiredPermission: '', category: 'Overview' },

      { name: 'Live Alerts', href: '/alerts', icon: Siren, badge: null, requiredPermission: 'alerts:read', category: 'Operations' },
      { name: 'Tickets', href: '/tickets', icon: Inbox, badge: null, requiredPermission: 'tickets:read', category: 'Operations' },
      { name: 'Reports', href: '/reports', icon: BarChart3, badge: null, requiredPermission: 'reports:read', category: 'Operations' },
      { name: 'Risk Matrix', href: '/risk-matrix', icon: Target, badge: null, requiredPermission: 'risk-matrix:read', category: 'Operations' },

      { name: 'Asset Register', href: '/asset-register', icon: Database, badge: null, requiredPermission: 'assets:read', category: 'Monitoring' },
      { name: 'Agents Overview', href: '/agents', icon: Bot, badge: null, requiredPermission: 'agents:read', category: 'Monitoring' },
      { name: 'Event Ingested', href: '/events-by-agent', icon: Zap, badge: null, requiredPermission: 'alerts:read', category: 'Monitoring' },
      { name: 'Log Source Coverage', href: '/logs-by-agent', icon: ScrollText, badge: null, requiredPermission: 'alerts:read', category: 'Monitoring' },
      { name: 'Rules', href: '/rules', icon: Gavel, badge: null, requiredPermission: 'alerts:read', category: 'Monitoring' },
      { name: 'IOC List', href: '/ioc-list', icon: Fingerprint, badge: null, requiredPermission: 'alerts:read', category: 'Monitoring' },

      { name: 'SIEM Portal', href: '/siem', icon: Network, badge: null, requiredPermission: 'siem:access', category: 'Tools' },
    ]
  }

  const navigation = getNavigationItems()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const decodedUser = getUserFromCookies()
    setUser(decodedUser)
  }, [])

  const visibleNavigation = navigation.filter(item => {
    if (!item.requiredPermission) return true
    if (user && user.permissions) {
      const [resource, action] = item.requiredPermission.split(':')
      return user.permissions[resource] && user.permissions[resource][action]
    }
    return false
  })

  // Group by category, preserving original order
  const grouped = visibleNavigation.reduce<Record<string, NavItem[]>>((acc, item) => {
    const cat = item.category || 'Menu'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
  const categoryOrder = Array.from(new Set(visibleNavigation.map(i => i.category || 'Menu')))

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="m-3 flex grow flex-col rounded-2xl bg-gradient-to-b from-blue-100/70 via-blue-50 to-blue-50/80 border border-blue-200/60 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] overflow-hidden">

        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center justify-center px-5 border-b border-blue-200/50">
          <img
            src="/cyb-logo.png"
            alt="CYB Logo"
            className="h-10 w-auto"
          />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-2.5 py-2.5 overflow-y-auto custom-scrollbar">
          <ul role="list" className="flex flex-1 flex-col gap-y-3">
            {categoryOrder.map((category) => (
              <li key={category}>
                <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-500/70">
                  {category}
                </p>
                <ul className="space-y-0.5">
                  {grouped[category].map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={clsx(
                            'group relative flex items-center gap-x-2 rounded-lg px-2 py-1.5 text-[12.5px] leading-4 font-medium transition-all duration-200 ease-out',
                            isActive
                              ? 'bg-white text-blue-700 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.18)]'
                              : 'text-slate-600 hover:bg-white/70 hover:text-blue-700 hover:translate-x-0.5'
                          )}
                        >
                          <span className={clsx(
                            'flex items-center justify-center h-6 w-6 rounded-md shrink-0 transition-all duration-200',
                            isActive
                              ? 'bg-blue-100'
                              : 'bg-white/60 group-hover:bg-blue-100 group-hover:scale-110'
                          )}>
                            <Icon
                              className={clsx(
                                'h-[13px] w-[13px] transition-colors',
                                isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'
                              )}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                          </span>
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className={clsx(
                              'ml-auto text-[9px] font-semibold rounded-full px-1.5 py-0.5 tracking-wide min-w-[20px] text-center',
                              isActive
                                ? 'bg-blue-100 text-blue-700'
                                : item.badge === 'BETA'
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'bg-rose-100 text-rose-700'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>

          {/* System Status */}
          <div className="mt-3 pt-2 border-t border-blue-200/50 text-slate-600">
            <SystemStatus />
          </div>
        </nav>
      </div>
    </div>
  )
}

// 'use client'

// import { useState, useEffect } from 'react'
// import Link from 'next/link'
// import { usePathname } from 'next/navigation'
// import {
//   HomeIcon,
//   ExclamationTriangleIcon,
//   DocumentChartBarIcon,
//   ShieldCheckIcon,
//   UsersIcon,
//   CpuChipIcon,
//   Cog6ToothIcon,
//   BuildingOfficeIcon,
//   TicketIcon
// } from '@heroicons/react/24/outline'
// import { clsx } from 'clsx'
// import { SystemStatus } from './system-status'
// import Cookies from 'js-cookie'

// export function Sidebar() {
//   const pathname = usePathname()

//   const navigation = [
//     { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, badge: null },
//     { name: 'Client Overview', href: '/overview', icon: BuildingOfficeIcon, badge: null },
//     { name: 'Live Alerts', href: '/alerts', icon: ExclamationTriangleIcon, badge: null },
//     { name: 'Tickets', href: '/tickets', icon: TicketIcon, badge: null },
//     { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon, badge: null },
//     { name: 'Compliance', href: '/compliance', icon: ShieldCheckIcon, badge: null },
//     { name: 'Agents Overview', href: '/agents', icon: UsersIcon, badge: null },
//     { name: 'SIEM Portal', href: '/siem', icon: CpuChipIcon, badge: null },
//     { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, badge: null },
//   ]



//   type UserType = {
//     clientName: string
//   }
//   const [user, setUser] = useState<UserType | null>(null)

//   useEffect(() => {
//     const userInfo = Cookies.get('user_info')

//     if (userInfo) {
//       try {
//         const parsedUser: UserType = JSON.parse(userInfo)
//         setUser(parsedUser)
//       } catch (error) {
//         console.error('Failed to parse user info from cookies', error)
//         setUser(null)
//       }
//     }
//   }, [])

//   return (
//     <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
//       <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-6 pb-4 shadow-xl border-r border-gray-200/70 dark:border-gray-800/50">
//         {/* Logo */}
//         <div className="flex h-16 shrink-0 items-center">
//           <div className="flex items-center space-x-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 animate-float">
//               <ShieldCheckIcon className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300">
//                 {user ? user.clientName : 'Codec Net'}
//               </h1>
//               <p className="text-xs text-gray-500 dark:text-gray-400">
//                 AI Based SIEM Dashboard
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Navigation */}
//         <nav className="flex flex-1 flex-col">
//           <ul role="list" className="flex flex-1 flex-col gap-y-7">
//             <li>
//               <ul role="list" className="-mx-2 space-y-1.5">
//                 {navigation.map((item) => {
//                   const isActive = pathname === item.href || (item.href === '/user' && (pathname.startsWith('/user') || pathname.startsWith('/permission') || pathname.startsWith('/role') || pathname.startsWith('/user')))
//                   return (
//                     <li key={item.name}>
//                       <Link
//                         href={item.href}
//                         className={clsx(
//                           'group flex gap-x-3 rounded-xl p-2.5 text-sm leading-6 font-medium transition-all duration-200',
//                           isActive
//                             ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/30'
//                             : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
//                         )}
//                       >
//                         <item.icon
//                           className={clsx(
//                             'h-5 w-5 shrink-0 group-hover:scale-110',
//                             isActive
//                               ? 'text-blue-600 dark:text-blue-400'
//                               : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
//                           )}
//                         />
//                         {item.name}
//                         {item.badge && (
//                           <span className="ml-auto w-6 h-6 text-xs font-medium bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-800/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shadow-sm border border-red-200/50 dark:border-red-800/30">
//                             {item.badge}
//                           </span>
//                         )}
//                       </Link>
//                     </li>
//                   )
//                 })}
//               </ul>
//             </li>

//             {/* System Status */}
//             <li className="mt-auto">
//               <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-100 dark:border-gray-700/30 shadow-sm">
//                 <SystemStatus />
//               </div>
//             </li>
//           </ul>
//         </nav>
//       </div>
//     </div>
//   )
// }
