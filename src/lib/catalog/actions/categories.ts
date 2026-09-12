'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { isValidSlug, slugify } from '@/lib/catalog/slug'
import type { ActionResult } from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function revalidateCatalog() {
  revalidatePath('/admin/catalog')
  revalidatePath('/admin/catalog/categories')
  revalidatePath('/shop')
  revalidatePath('/')
}

/**
 * Create a category. Soft-active by default.
 */
export async function createCategory(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slugInput = readString(formData, 'slug')
  const slug = slugInput || slugify(name)
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const sortOrder = Number(readString(formData, 'sort_order') || '0')
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      seo_title: seoTitle,
      seo_description: seoDescription,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      active,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already in use.' }
    }
    return { ok: false, error: error.message }
  }

  revalidateCatalog()
  return { ok: true, data: { id: data.id } }
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  categoryId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slug = readString(formData, 'slug')
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const sortOrder = Number(readString(formData, 'sort_order') || '0')
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      slug,
      seo_title: seoTitle,
      seo_description: seoDescription,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      active,
    })
    .eq('id', categoryId)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already in use.' }
    }
    return { ok: false, error: error.message }
  }

  revalidateCatalog()
  revalidatePath(`/admin/catalog/categories/${categoryId}`)
  return { ok: true }
}

/**
 * Soft-deactivate a category (never hard-delete).
 */
export async function deactivateCategory(
  categoryId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ active: false })
    .eq('id', categoryId)

  if (error) return { ok: false, error: error.message }

  revalidateCatalog()
  return { ok: true }
}

/**
 * Re-activate a category.
 */
export async function activateCategory(
  categoryId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ active: true })
    .eq('id', categoryId)

  if (error) return { ok: false, error: error.message }

  revalidateCatalog()
  return { ok: true }
}
