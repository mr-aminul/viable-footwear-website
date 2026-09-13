'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Reorder, useDragControls, useMotionValue, useReducedMotion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { reorderCategories } from '@/lib/catalog/actions/categories'
import { FormError, StatusPill } from '@/components/admin/ui'

export type CategoryRow = {
  id: string
  name: string
  slug: string
  sort_order: number
  active: boolean
}

const rowGridClassName =
  'grid grid-cols-[2.5rem_minmax(7rem,1.4fr)_minmax(6rem,1fr)_5.5rem_3.5rem] items-center gap-x-2 px-2 text-[13px] sm:px-3'

function sameOrder(a: CategoryRow[], b: CategoryRow[]) {
  if (a.length !== b.length) return false
  return a.every((category, index) => category.id === b[index]?.id)
}

function CategoryReorderRow({
  category,
  canDrag,
  onDragStart,
  onDragEnd,
}: {
  category: CategoryRow
  canDrag: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)

  return (
    <Reorder.Item
      value={category}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={() => {
        x.set(0)
        onDragEnd()
      }}
      // Lock cross-axis so leftover drag translateX can't misalign the row.
      style={{ x }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }
      }
      whileDrag={{
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
        backgroundColor: 'rgba(255,255,255,1)',
        zIndex: 20,
        cursor: 'grabbing',
      }}
      className={[
        rowGridClassName,
        'relative w-full border-b border-cloud bg-white last:border-0',
        canDrag ? 'touch-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-center text-mute">
        {canDrag ? (
          <button
            type="button"
            aria-label={`Drag to reorder ${category.name}`}
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg hover:bg-mist active:cursor-grabbing"
            onPointerDown={(event) => {
              event.preventDefault()
              controls.start(event)
            }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center opacity-40">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="min-w-0 py-3 font-medium text-ink">{category.name}</div>
      <div className="min-w-0 py-3 text-mute">{category.slug}</div>
      <div className="py-3">
        <StatusPill active={category.active} />
      </div>
      <div className="py-3 text-right">
        <Link
          href={`/admin/catalog/categories/${category.id}`}
          className="font-semibold text-navy hover:underline"
        >
          Edit
        </Link>
      </div>
    </Reorder.Item>
  )
}

export function CategoriesTable({
  categories: initialCategories,
}: {
  categories: CategoryRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [categories, setCategories] = useState(initialCategories)
  const [error, setError] = useState<string | null>(null)
  const orderBeforeDragRef = useRef(initialCategories)
  const categoriesRef = useRef(categories)

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  useEffect(() => {
    categoriesRef.current = categories
  }, [categories])

  const persistOrder = (next: CategoryRow[]) => {
    setError(null)
    startTransition(async () => {
      const result = await reorderCategories(next.map((category) => category.id))
      if (!result.ok) {
        setError(result.error)
        setCategories(orderBeforeDragRef.current)
        return
      }
      router.refresh()
    })
  }

  const canDrag = categories.length > 1 && !pending

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <p className="text-[13px] text-mute">
        Drag the handle to set the order shown on the storefront.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <div className="min-w-[560px]">
          <div
            className={`${rowGridClassName} border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute`}
          >
            <div className="py-3" aria-label="Reorder" />
            <div className="py-3">Name</div>
            <div className="py-3">Slug</div>
            <div className="py-3">Status</div>
            <div className="py-3" />
          </div>

          <Reorder.Group
            axis="y"
            values={categories}
            onReorder={(next) => {
              categoriesRef.current = next
              setCategories(next)
            }}
            as="div"
            className="relative"
          >
            {categories.map((category) => (
              <CategoryReorderRow
                key={category.id}
                category={category}
                canDrag={canDrag}
                onDragStart={() => {
                  orderBeforeDragRef.current = categoriesRef.current
                }}
                onDragEnd={() => {
                  const next = categoriesRef.current
                  if (!sameOrder(next, orderBeforeDragRef.current)) {
                    persistOrder(next)
                  }
                }}
              />
            ))}
          </Reorder.Group>
        </div>
      </div>
    </div>
  )
}
