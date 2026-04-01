// composables/useTickets.ts
// Backend aún no implementado — toda la lógica vive en localStorage + caché en memoria

export interface TicketType {
  id: string
  name: string        // 'Oro', 'Plata', 'VIP', 'General', etc.
  price: number
  available: number   // cupos disponibles
  sold: number        // vendidos (calculado)
}

export interface Ticket {
  id: string
  eventId: number
  eventName: string
  eventDate: string | null
  eventLocation: string
  type: string
  price: number
  qrCode: string      // string único para el QR
  purchasedAt: string
  holderName: string
}

export interface PurchaseForm {
  types: { typeId: string; quantity: number }[]
  holderName: string
}

// ─── Caché en memoria para top 3 ────────────────────────────────────────────
// Clave: eventId → cantidad de tickets vendidos
const salesCache = ref<Record<number, number>>({})

function rebuildSalesCache(tickets: Ticket[]) {
  const map: Record<number, number> = {}
  for (const t of tickets) {
    map[t.eventId] = (map[t.eventId] ?? 0) + 1
  }
  salesCache.value = map
}

// Top 3 eventos activos más vendidos — sin tocar la BD
export function useTopEvents(activeEventIds: number[]) {
  return computed(() => {
    return [...activeEventIds]
      .map(id => ({ id, sales: salesCache.value[id] ?? 0 }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3)
  })
}

// ─── Tipos de entrada mock por evento ───────────────────────────────────────
// Mientras el backend no exista, los tipos se guardan en localStorage
const TYPES_KEY = 'ticket_types'

function loadAllTypes(): Record<number, TicketType[]> {
  if (!import.meta.client) return {}
  try { return JSON.parse(localStorage.getItem(TYPES_KEY) ?? '{}') } catch { return {} }
}

function saveAllTypes(all: Record<number, TicketType[]>) {
  if (!import.meta.client) return
  localStorage.setItem(TYPES_KEY, JSON.stringify(all))
}

// ─── Tickets comprados ───────────────────────────────────────────────────────
const TICKETS_KEY = 'purchased_tickets'

function loadTickets(): Ticket[] {
  if (!import.meta.client) return []
  try { return JSON.parse(localStorage.getItem(TICKETS_KEY) ?? '[]') } catch { return [] }
}

function saveTickets(tickets: Ticket[]) {
  if (!import.meta.client) return
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
  rebuildSalesCache(tickets)
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

function generateQr(eventId: number, type: string, idx: number): string {
  // Código único legible — en producción esto vendría del backend
  return `EVT-${eventId}-${type.toUpperCase().replace(/\s/g, '')}-${generateId()}-${idx}`
}

export function isEventActive(dateTime: string | null): boolean {
  if (!dateTime) return true // sin fecha = activo
  const eventEnd = new Date(dateTime)
  eventEnd.setDate(eventEnd.getDate() + 1) // +1 día
  return eventEnd > new Date()
}

// ─── Composable principal ────────────────────────────────────────────────────
export function useTickets() {
  const allTickets = ref<Ticket[]>([])
  const loading = ref(false)

  function init() {
    if (!import.meta.client) return
    allTickets.value = loadTickets()
    rebuildSalesCache(allTickets.value)
  }

  // Tipos de entrada para un evento
  function getTypesForEvent(eventId: number): TicketType[] {
    const all = loadAllTypes()
    return all[eventId] ?? []
  }

  // Admin: registrar / actualizar tipos de un evento
  function setTypesForEvent(eventId: number, types: TicketType[]) {
    const all = loadAllTypes()
    all[eventId] = types
    saveAllTypes(all)
  }

  // Tickets comprados del usuario actual para un evento
  function getTicketsForEvent(eventId: number): Ticket[] {
    return allTickets.value.filter(t => t.eventId === eventId)
  }

  // Todos los tickets del usuario (histórico completo)
  function getUserTickets(): Ticket[] {
    return [...allTickets.value].sort(
      (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    )
  }

  // Cupos disponibles reales (descontando vendidos)
  function getAvailability(eventId: number): Record<string, number> {
    const types = getTypesForEvent(eventId)
    const soldMap: Record<string, number> = {}
    for (const t of allTickets.value.filter(t => t.eventId === eventId)) {
      soldMap[t.type] = (soldMap[t.type] ?? 0) + 1
    }
    const result: Record<string, number> = {}
    for (const tp of types) {
      result[tp.id] = Math.max(0, tp.available - (soldMap[tp.name] ?? 0))
    }
    return result
  }

  // Comprar tickets
  function purchaseTickets(
    event: { id_event: number; NameEvent: string; date_time: string | null; location: string },
    form: PurchaseForm
  ): { success: boolean; tickets?: Ticket[]; error?: string } {

    if (!isEventActive(event.date_time)) {
      return { success: false, error: 'Este evento ya no está activo.' }
    }

    const types = getTypesForEvent(event.id_event)
    const availability = getAvailability(event.id_event)
    const newTickets: Ticket[] = []

    for (const item of form.types) {
      if (!item.quantity || item.quantity <= 0) continue
      const tp = types.find(t => t.id === item.typeId)
      if (!tp) return { success: false, error: `Tipo de entrada no encontrado.` }
      const avail = availability[item.typeId] ?? 0
      if (item.quantity > avail) {
        return { success: false, error: `Solo quedan ${avail} entradas de tipo "${tp.name}".` }
      }
      for (let i = 0; i < item.quantity; i++) {
        newTickets.push({
          id: generateId(),
          eventId: event.id_event,
          eventName: event.NameEvent,
          eventDate: event.date_time,
          eventLocation: event.location,
          type: tp.name,
          price: tp.price,
          qrCode: generateQr(event.id_event, tp.name, i + 1),
          purchasedAt: new Date().toISOString(),
          holderName: form.holderName,
        })
      }
    }

    if (newTickets.length === 0) {
      return { success: false, error: 'Selecciona al menos una entrada.' }
    }

    const updated = [...allTickets.value, ...newTickets]
    allTickets.value = updated
    saveTickets(updated)
    return { success: true, tickets: newTickets }
  }

  return {
    allTickets: readonly(allTickets),
    salesCache: readonly(salesCache),
    loading: readonly(loading),
    init,
    getTypesForEvent,
    setTypesForEvent,
    getTicketsForEvent,
    getUserTickets,
    getAvailability,
    purchaseTickets,
    isEventActive,
  }
}