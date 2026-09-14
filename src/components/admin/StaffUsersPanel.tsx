'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Plus, X } from 'lucide-react'
import {
  createStaffUser,
  setStaffPassword,
  updateStaffActive,
  updateStaffRole,
} from '@/lib/auth/staff-actions'
import {
  AdminPageHeader,
  FormError,
  FormSuccess,
  Field,
  adminButtonClassName,
  inputClassName,
} from '@/components/admin/ui'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import type { UserRole } from '@/lib/supabase/database.types'

export type StaffUserRow = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  active: boolean
}

type DialogMode =
  | { type: 'add' }
  | { type: 'password'; user: StaffUserRow }
  | null

function StaffDialogShell({
  title,
  description,
  onDismiss,
  isSubmitting,
  children,
}: {
  title: string
  description: string
  onDismiss: () => void
  isSubmitting: boolean
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = 'staff-dialog-title'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        onClick={onDismiss}
        disabled={isSubmitting}
        aria-label="Close dialog"
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-cloud bg-white p-6 text-ink shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold text-ink"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-mute transition hover:bg-mist hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function StaffUsersPanel({
  users,
  currentUserId,
}: {
  users: StaffUserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('manager')
  const [addPassword, setAddPassword] = useState('')
  const [addPasswordConfirm, setAddPasswordConfirm] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const resetDialogFields = () => {
    setAddEmail('')
    setAddName('')
    setAddRole('manager')
    setAddPassword('')
    setAddPasswordConfirm('')
    setNewPassword('')
    setNewPasswordConfirm('')
  }

  const closeDialog = () => {
    if (pending) return
    setDialog(null)
    resetDialogFields()
  }

  const finishDialog = () => {
    setDialog(null)
    resetDialogFields()
  }

  const runAction = (
    userId: string | null,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string,
  ) => {
    setError(null)
    setSuccess(null)
    setBusyUserId(userId)
    startTransition(async () => {
      const result = await action()
      setBusyUserId(null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(successMessage)
      finishDialog()
      router.refresh()
    })
  }

  const handleRoleChange = (user: StaffUserRow, role: UserRole) => {
    if (role === user.role) return
    runAction(
      user.id,
      () => updateStaffRole({ userId: user.id, role }),
      `${user.email} is now ${role}.`,
    )
  }

  const handleActiveChange = (user: StaffUserRow, active: boolean) => {
    if (active === user.active) return
    runAction(
      user.id,
      () => updateStaffActive({ userId: user.id, active }),
      active
        ? `${user.email} is active again.`
        : `${user.email} is disabled.`,
    )
  }

  const handleCreateUser = () => {
    if (addPassword !== addPasswordConfirm) {
      setError('Passwords do not match.')
      return
    }
    runAction(
      null,
      () =>
        createStaffUser({
          email: addEmail,
          fullName: addName,
          role: addRole,
          password: addPassword,
        }),
      'Staff user created.',
    )
  }

  const handleSetPassword = (user: StaffUserRow) => {
    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match.')
      return
    }
    runAction(
      user.id,
      () => setStaffPassword({ userId: user.id, password: newPassword }),
      `Password updated for ${user.email}.`,
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff users"
        description="People who can manage the store. Admins have full access; Managers can update products and categories."
        actions={
          <AdminActionButton
            onClick={() => {
              setError(null)
              setSuccess(null)
              setDialog({ type: 'add' })
            }}
          >
            <Plus size={16} className="mr-1.5" aria-hidden />
            Add user
          </AdminActionButton>
        }
      />

      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-mute">
                  No staff users yet.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const rowBusy = pending && busyUserId === user.id
                const isYou = user.id === currentUserId
                return (
                  <tr
                    key={user.id}
                    className="border-b border-cloud last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {user.email}
                      {isYou ? (
                        <span className="ml-2 text-[11px] font-normal text-mute">
                          (you)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {user.full_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`${inputClassName} w-auto min-w-[7.5rem] py-1.5 capitalize`}
                        value={user.role}
                        disabled={rowBusy || pending}
                        aria-label={`Role for ${user.email}`}
                        onChange={(e) =>
                          handleRoleChange(user, e.target.value as UserRole)
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`${inputClassName} w-auto min-w-[7rem] py-1.5`}
                        value={user.active ? 'active' : 'disabled'}
                        disabled={rowBusy || pending || isYou}
                        aria-label={`Status for ${user.email}`}
                        onChange={(e) =>
                          handleActiveChange(
                            user,
                            e.target.value === 'active',
                          )
                        }
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline disabled:opacity-50"
                        disabled={pending}
                        onClick={() => {
                          setError(null)
                          setSuccess(null)
                          setNewPassword('')
                          setNewPasswordConfirm('')
                          setDialog({ type: 'password', user })
                        }}
                      >
                        <KeyRound size={14} aria-hidden />
                        Password
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {dialog?.type === 'add' ? (
        <StaffDialogShell
          title="Add staff user"
          description="Creates a login that can access the admin panel. Share the password securely."
          onDismiss={closeDialog}
          isSubmitting={pending}
        >
          <div className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="off"
                className={inputClassName}
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <Field label="Name" hint="Optional display name">
              <input
                type="text"
                autoComplete="off"
                className={inputClassName}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Role">
              <select
                className={inputClassName}
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as UserRole)}
                disabled={pending}
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Password" hint="At least 8 characters">
              <input
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                value={addPasswordConfirm}
                onChange={(e) => setAddPasswordConfirm(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={adminButtonClassName('secondary')}
                onClick={closeDialog}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={adminButtonClassName('primary')}
                onClick={handleCreateUser}
                disabled={pending || !addEmail || !addPassword}
              >
                {pending ? (
                  <>
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create user'
                )}
              </button>
            </div>
          </div>
        </StaffDialogShell>
      ) : null}

      {dialog?.type === 'password' ? (
        <StaffDialogShell
          title="Set password"
          description={`Choose a new password for ${dialog.user.email}. They can sign in immediately with it.`}
          onDismiss={closeDialog}
          isSubmitting={pending}
        >
          <div className="space-y-4">
            <Field label="New password" hint="At least 8 characters">
              <input
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={adminButtonClassName('secondary')}
                onClick={closeDialog}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={adminButtonClassName('primary')}
                onClick={() => handleSetPassword(dialog.user)}
                disabled={pending || !newPassword}
              >
                {pending ? (
                  <>
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save password'
                )}
              </button>
            </div>
          </div>
        </StaffDialogShell>
      ) : null}
    </div>
  )
}
