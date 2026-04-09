import { ref, computed, readonly } from 'vue'


export interface TicketCatalog {
  id_catalog: number
  typeName: string
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface TicketCatalogFormErrors {
  typeName?: string
}

function validateForm(typeName: string): TicketCatalogFormErrors {
  const errors: TicketCatalogFormErrors = {}
  if (!typeName.trim()) errors.typeName = 'El nombre es obligatorio.'
  else if (typeName.trim().length < 2) errors.typeName = 'Mínimo 2 caracteres.'
  return errors
}

const catalog = ref<TicketCatalog[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useTicketCatalog() {
  const config = useRuntimeConfig()
  const API = `${config.public.apiUrl}/api`


  const { authHeaders } = useAuth()

  const activeCatalog = computed(() =>
    catalog.value.filter(t => !t.deleted_at)
  )

  const sortedCatalog = computed(() =>
    [...catalog.value].sort((a, b) => a.typeName.localeCompare(b.typeName, 'es'))
  )

  const sortedActiveCatalog = computed(() =>
    [...activeCatalog.value].sort((a, b) => a.typeName.localeCompare(a.typeName, 'es'))
  )

  // ── GET /ticket-catalog  (público, devuelve solo activos)
  // Para el admin se usa la misma ruta pero con authHeaders para traer también los inactivos
  async function fetchCatalogAdmin() {
    loading.value = true; error.value = null
    try {
      const res = await fetch(`${API}/ticket-catalog`, {   // ← era /ticket-catalog/admin
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Error al cargar tipos de ticket')
      const data = await res.json()
      // El controller devuelve { ok: true, data: [...] }
      catalog.value = data.data ?? data
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  async function createCatalogItem(typeName: string): Promise<{ success: boolean; errors?: TicketCatalogFormErrors; message?: string }> {
    const errors = validateForm(typeName)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/ticket-catalog/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ typeName }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409
        ? { success: false, errors: { typeName: data.error } }
        : { success: false, message: data.error }
      await fetchCatalogAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function updateCatalogItem(id: number, typeName: string): Promise<{ success: boolean; errors?: TicketCatalogFormErrors; message?: string }> {
    const errors = validateForm(typeName)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/ticket-catalog/admin/${id}`, {
        method: 'PUT',                                     // ← coincide con la nueva ruta PUT /admin/:id
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ typeName }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409
        ? { success: false, errors: { typeName: data.error } }
        : { success: false, message: data.error }
      await fetchCatalogAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function deactivateCatalogItem(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/ticket-catalog/admin/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error }
      await fetchCatalogAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function reactivateCatalogItem(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/ticket-catalog/admin/${id}/restore`, {
        method: 'PATCH',                                   // ← coincide con PATCH /admin/:id/restore
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error }
      await fetchCatalogAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  return {
    catalog: readonly(catalog),
    loading: readonly(loading),
    error: readonly(error),
    activeCatalog,
    sortedCatalog,
    sortedActiveCatalog,
    validateForm,
    fetchCatalogAdmin,
    createCatalogItem,
    updateCatalogItem,
    deactivateCatalogItem,
    reactivateCatalogItem,
  }
}