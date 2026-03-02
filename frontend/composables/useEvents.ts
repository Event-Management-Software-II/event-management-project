// composables/useEvents.ts
import { ref, computed, readonly } from 'vue'

const API = 'http://localhost:3001/api'

export interface Event {
  id_event: number
  NameEvent: string
  Id_category: number
  value: number
  description: string
  location: string
  date_time: string | null
  created_at: string
  deleted_at: string | null
  nameCategory: string
  imageUrl: string | null
}

export interface EventForm {
  NameEvent: string
  Id_category: string
  value: string
  description: string
  location: string
  date_time?: string
  imageUrl?: string
}

export interface EventFormErrors {
  NameEvent?: string
  Id_category?: string
  value?: string
  description?: string
  location?: string
}

const events = ref<Event[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function validateForm(form: EventForm): EventFormErrors {
  const errors: EventFormErrors = {}
  const alphanum = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúÑñüÜ\s]+$/
  if (!form.NameEvent.trim()) errors.NameEvent = 'El nombre es obligatorio.'
  else if (!alphanum.test(form.NameEvent)) errors.NameEvent = 'Solo letras, números y espacios.'
  if (!form.Id_category) errors.Id_category = 'Debes seleccionar una categoría.'
  if (form.value === '' || Number.isNaN(Number(form.value)) || Number(form.value) < 0)
    errors.value = 'Debe ser un número >= 0.'
  if (!form.description.trim()) errors.description = 'La descripción es obligatoria.'
  else if (form.description.trim().length < 20)
    errors.description = `Mínimo 20 caracteres. Faltan ${20 - form.description.trim().length}.`
  if (!form.location.trim()) errors.location = 'La ubicación es obligatoria.'
  return errors
}

async function registerInterest(id: number): Promise<{ success: boolean; total_interests?: number; message?: string }> {
  try {
    const res = await fetch(`${API}/events/${id}/interest`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { success: false, message: data.error }
    return { success: true, total_interests: data.total_interests }
  } catch { return { success: false, message: 'Error de conexión.' } }
}

async function removeInterest(id: number): Promise<{ success: boolean; total_interests?: number; message?: string }> {
  try {
    const res = await fetch(`${API}/events/${id}/interest`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return { success: false, message: data.error }
    return { success: true, total_interests: data.total_interests }
  } catch { return { success: false, message: 'Error de conexión.' } }
}

async function getInterestStatus(id: number): Promise<{ interested: boolean; total_interests: number }> {
  try {
    const res = await fetch(`${API}/events/${id}/interest/status`)
    return await res.json()
  } catch { return { interested: false, total_interests: 0 } }
}

export function useEvents() {
  const visibleEvents = computed(() => events.value.filter(e => !e.deleted_at))

  async function fetchEvents(filters?: { name?: string; category_id?: string }) {
    loading.value = true; error.value = null
    try {
      const params = new URLSearchParams()
      if (filters?.name) params.set('name', filters.name)
      if (filters?.category_id) params.set('category_id', filters.category_id)
      const res = await fetch(`${API}/events?${params}`)
      if (!res.ok) throw new Error('Error al cargar eventos')
      events.value = await res.json()
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  async function fetchEventsAdmin() {
    loading.value = true; error.value = null
    try {
      const res = await fetch(`${API}/events/admin/all`)
      if (!res.ok) throw new Error('Error al cargar eventos')
      events.value = await res.json()
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }
  
  async function createEvent(form: EventForm): Promise<{ success: boolean; errors?: EventFormErrors; message?: string }> {
    const errors = validateForm(form)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/events/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, Id_category: Number(form.Id_category), value: Number(form.value) }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { NameEvent: data.error } } : { success: false, message: data.error }
      await fetchEventsAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function updateEvent(id: number, form: EventForm): Promise<{ success: boolean; errors?: EventFormErrors; message?: string }> {
    const errors = validateForm(form)
    if (Object.keys(errors).length) return { success: false, errors }
    try {
      const res = await fetch(`${API}/events/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, Id_category: Number(form.Id_category), value: Number(form.value) }),
      })
      const data = await res.json()
      if (!res.ok) return res.status === 409 ? { success: false, errors: { NameEvent: data.error } } : { success: false, message: data.error }
      await fetchEventsAdmin()
      return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function deleteEvent(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/events/admin/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); return { success: false, message: d.error } }
      await fetchEventsAdmin(); return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  async function restoreEvent(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/events/admin/${id}/restore`, { method: 'PATCH' })
      if (!res.ok) { const d = await res.json(); return { success: false, message: d.error } }
      await fetchEventsAdmin(); return { success: true }
    } catch { return { success: false, message: 'Error de conexión.' } }
  }

  return {
    events: readonly(events),
    loading: readonly(loading),
    error: readonly(error),
    visibleEvents,
    validateForm,
    fetchEvents,
    fetchEventsAdmin,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    registerInterest,
    removeInterest,
    getInterestStatus,
  }
}