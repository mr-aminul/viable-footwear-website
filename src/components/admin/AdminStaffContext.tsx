'use client'

import { createContext, useContext } from 'react'
import type { StaffProfile } from '@/lib/auth/session'

const AdminStaffContext = createContext<StaffProfile | null>(null)

export function AdminStaffProvider({
  profile,
  children,
}: {
  profile: StaffProfile
  children: React.ReactNode
}) {
  return (
    <AdminStaffContext.Provider value={profile}>
      {children}
    </AdminStaffContext.Provider>
  )
}

export function useStaffProfile(): StaffProfile {
  const profile = useContext(AdminStaffContext)
  if (!profile) {
    throw new Error('useStaffProfile must be used within AdminStaffProvider')
  }
  return profile
}
