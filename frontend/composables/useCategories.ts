import { ref, computed, readonly } from 'vue'


export interface Category {
  id_category: number
  categoryName: string      // Cambiado de name/nameCategory
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CategoryFormErrors {
  categoryName?: string
}

function validateForm(categoryName: string): CategoryFormErrors {
  const errors: CategoryFormErrors = {}
  if (!categoryName.trim()) errors.categoryName = 'El nombre es obligatorio.'
  else if (categoryName.trim().length < 2) errors.categoryName = 'Mínimo 2 caracteres.'
  return errors
}

const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useCategories() {
  const config = useRuntimeConfig()
  const API = `${config.public.apiUrl}/api`

  const { authHeaders } = useAuth()

  const activeCategories = computed(() =>
    categories.value.filter(c => !c.deleted_at)
  )

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'es'))
  )

  const sortedActiveCategories = computed(() =>
    [...activeCategories.value].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'es'))
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
      const res = await fetch(`${API}/categories/admin`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Error al cargar categorías')
      categories.value = await res.json()
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  async function createCategory(categoryName: string): Promise<{ success: boolean; errors?: CategoryFormErrors; message?: string }> {
    const errors = validateForm(categoryName)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/categories/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ categoryName }),  // El controller espera 'name' pero guarda como categoryName
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { categoryName: data.error } } : { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function updateCategory(id: number, categoryName: string): Promise<{ success: boolean; errors?: CategoryFormErrors; message?: string }> {
    const errors = validateForm(categoryName)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/categories/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ categoryName }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { categoryName: data.error } } : { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function deactivateCategory(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/categories/admin/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error }
      await fetchCategoriesAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function reactivateCategory(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/categories/admin/${id}/restore`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
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