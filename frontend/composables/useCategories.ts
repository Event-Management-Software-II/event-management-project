// composables/useCategories.ts
import { ref, computed, readonly } from 'vue'

const API = 'http://localhost:3001/api'

export interface Category {
  id_category: number
  nameCategory: string
  created_at: string
  deleted_at?: string | null
}

export interface CategoryFormErrors {
  name?: string
}

function validateForm(name: string): CategoryFormErrors {
  const errors: CategoryFormErrors = {}
  if (!name.trim()) errors.name = 'El nombre es obligatorio.'
  else if (name.trim().length < 2) errors.name = 'Mínimo 2 caracteres.'
  return errors
}

const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useCategories() {
  const activeCategories = computed(() =>
    categories.value.filter(c => !c.deleted_at)
  )

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.nameCategory.localeCompare(b.nameCategory, 'es'))
  )

  const sortedActiveCategories = computed(() =>
    [...activeCategories.value].sort((a, b) => a.nameCategory.localeCompare(b.nameCategory, 'es'))
  )

  async function fetchCategories(order?: 'asc') {
    loading.value = true; error.value = null
    try {
      const params = order ? `?order=${order}` : ''
      const res = await fetch(`${API}/categories${params}`)
      if (!res.ok) throw new Error('Error al cargar categorías')
      categories.value = await res.json()
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  async function fetchCategoriesAdmin() {
    loading.value = true; error.value = null
    try {
      const res = await fetch(`${API}/categories/admin`)
      if (!res.ok) throw new Error('Error al cargar categorías')
      categories.value = await res.json()
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  async function createCategory(name: string): Promise<{ success: boolean; errors?: CategoryFormErrors; message?: string }> {
    const errors = validateForm(name)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/categories/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameCategory: name }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { name: data.error } } : { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function updateCategory(id: number, name: string): Promise<{ success: boolean; errors?: CategoryFormErrors; message?: string }> {
    const errors = validateForm(name)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/categories/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameCategory: name }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { name: data.error } } : { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function deactivateCategory(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/categories/admin/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function reactivateCategory(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/categories/admin/${id}/restore`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  return {
    categories: readonly(categories),
    loading: readonly(loading),
    error: readonly(error),
    activeCategories,
    sortedCategories,
    sortedActiveCategories,
    validateForm,
    fetchCategories,
    fetchCategoriesAdmin,
    createCategory,
    updateCategory,
    deactivateCategory,
    reactivateCategory,
  }
}