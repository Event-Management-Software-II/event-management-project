import { ref, computed, readonly } from 'vue';

export interface Event {
  id_event: number;
  eventName: string;
  id_category: number;
  price: number;
  description: string;
  location: string;
  date_time: string | null;
  capacity?: number | null;
  created_at: string;
  deleted_at: string | null;
  category?: {
    id_category: number;
    categoryName: string;
  };
  images?: { image_url: string; type: string }[];
  categoryName?: string;
  imageUrl?: string | null;
  ticketTypes?: any[];
}

export interface EventForm {
  eventName: string;
  id_category: string;
  price: string;
  description: string;
  location: string;
  date_time?: string;
  image_url?: string;
  ticketTypes?: {
    id_catalog: number;
    price: number;
    capacity: number;
  }[];
}

export interface EventFormErrors {
  eventName?: string;
  id_category?: string;
  price?: string;
  description?: string;
  location?: string;
  [key: string]: string | undefined;
}

const events = ref<Event[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function mapEvent(e: any): Event {
  return {
    ...e,
    categoryName: e.category?.categoryName ?? '',
    imageUrl: e.images?.[0]?.image_url ?? null,
  };
}

function validateForm(form: EventForm): EventFormErrors {
  const errors: EventFormErrors = {};
  const alphanum = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúÑñüÜ\s]+$/;
  if (!form.eventName.trim()) errors.eventName = 'El nombre es obligatorio.';
  else if (!alphanum.test(form.eventName))
    errors.eventName = 'Solo letras, números y espacios.';
  if (!form.id_category)
    errors.id_category = 'Debes seleccionar una categoría.';
  if (!form.description.trim())
    errors.description = 'La descripción es obligatoria.';
  else if (form.description.trim().length < 20)
    errors.description = `Mínimo 20 caracteres. Faltan ${20 - form.description.trim().length}.`;
  if (!form.location.trim()) errors.location = 'La ubicación es obligatoria.';
  return errors;
}

export function useEvents() {
  const config = useRuntimeConfig();
  const API = `${config.public.apiUrl}/api`;

  const { authHeaders } = useAuth();

  const visibleEvents = computed(() =>
    events.value.filter((e) => !e.deleted_at)
  );

  async function fetchEvents(filters?: {
    name?: string;
    category_id?: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.name) params.set('name', filters.name);
      if (filters?.category_id) params.set('category_id', filters.category_id);
      const res = await fetch(`${API}/events?${params}`);
      if (!res.ok) throw new Error('Error al cargar eventos');
      events.value = (await res.json()).map(mapEvent);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEventsAdmin() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API}/events/admin/all`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Error al cargar eventos');
      events.value = (await res.json()).map(mapEvent);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function createEvent(
    form: EventForm
  ): Promise<{ success: boolean; errors?: EventFormErrors; message?: string }> {
    const errors = validateForm(form);
    if (Object.keys(errors).length) return { success: false, errors };
    try {
      const res = await fetch(`${API}/events/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          eventName: form.eventName,
          id_category: Number(form.id_category),
          description: form.description,
          location: form.location,
          date_time: form.date_time,
          image_url: form.image_url,
          ticketTypes: form.ticketTypes ?? [], // ← CORRECCIÓN
        }),
      });
      const data = await res.json();
      if (!res.ok)
        return res.status === 409
          ? { success: false, errors: { eventName: data.error } }
          : { success: false, message: data.error };
      await fetchEventsAdmin();
      return { success: true };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function updateEvent(
    id: number,
    form: EventForm
  ): Promise<{ success: boolean; errors?: EventFormErrors; message?: string }> {
    const errors = validateForm(form);
    if (Object.keys(errors).length) return { success: false, errors };
    try {
      const res = await fetch(`${API}/events/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          eventName: form.eventName,
          id_category: Number(form.id_category),
          description: form.description,
          location: form.location,
          date_time: form.date_time,
          image_url: form.image_url,
          ticketTypes: form.ticketTypes ?? [], // ← CORRECCIÓN
        }),
      });
      const data = await res.json();
      if (!res.ok)
        return res.status === 409
          ? { success: false, errors: { eventName: data.error } }
          : { success: false, message: data.error };
      await fetchEventsAdmin();
      return { success: true };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function deleteEvent(
    id: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/events/admin/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        return { success: false, message: d.error };
      }
      await fetchEventsAdmin();
      return { success: true };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function restoreEvent(
    id: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API}/events/admin/${id}/restore`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        return { success: false, message: d.error };
      }
      await fetchEventsAdmin();
      return { success: true };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function registerInterest(
    id: number
  ): Promise<{ success: boolean; total_interests?: number; message?: string }> {
    try {
      const res = await fetch(`${API}/events/${id}/interest`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error };
      return { success: true, total_interests: data.total_interests };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function removeInterest(
    id: number
  ): Promise<{ success: boolean; total_interests?: number; message?: string }> {
    try {
      const res = await fetch(`${API}/events/${id}/interest`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error };
      return { success: true, total_interests: data.total_interests };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    }
  }

  async function getInterestStatus(
    id: number
  ): Promise<{ interested: boolean }> {
    try {
      const res = await fetch(`${API}/events/${id}/interest/status`, {
        headers: authHeaders(),
      });
      return await res.json();
    } catch {
      return { interested: false };
    }
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
  };
}
