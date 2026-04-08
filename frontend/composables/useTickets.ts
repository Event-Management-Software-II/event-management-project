import { ref } from 'vue'


export interface TicketType {
  id: string
  name: string
  price: number
  available: number
  sold: number
}

export interface Ticket {
  id: string
  eventId: number
  eventName: string
  eventDate: string | null
  eventLocation: string
  type: string
  price: number
  qrCode: string
  purchasedAt: string
  holderName: string
}

export interface PurchaseForm {
  types: { typeId: string; quantity: number }[]
  holderName: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isEventActive(date_time: string | null): boolean {
  if (!date_time) return true
  return new Date(date_time) > new Date()
}

// ── Caché en memoria (compartida entre instancias) ────────────────────────────

// eventId → TicketType[]
const typesCache = ref<Record<number, TicketType[]>>({})
// eventId → { typeId → disponibles }
const availabilityCache = ref<Record<number, Record<string, number>>>({})

const generateId = () => Math.random().toString(36).substring(2, 10)
const generateQr = (eventId: number, typeName: string, seq: number) =>
  `QR-${eventId}-${typeName.toUpperCase()}-${seq}-${Date.now()}`

// ── Caché de ventas para top eventos ─────────────────────────────────────────

const salesCache = ref<Record<number, number>>({})

function rebuildSalesCache(tickets: Ticket[]) {
  const map: Record<number, number> = {}
  for (const t of tickets) {
    map[t.eventId] = (map[t.eventId] ?? 0) + 1
  }
  salesCache.value = map
}

export function useTopEvents(activeEventIds: number[]) {
  const topEventIds = ref<number[]>([])

  function updateTop() {
    const sorted = Object.entries(salesCache.value)
      .map(([idStr, count]) => ({ id: Number(idStr), count }))
      .filter(item => activeEventIds.includes(item.id))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    topEventIds.value = sorted.map(s => s.id)
  }

  return { topEventIds, updateTop }
}

// ── Composable principal ──────────────────────────────────────────────────────

export function useTickets() {
  const allTickets = ref<Ticket[]>([])

  // ── Persistencia ────────────────────────────────────────────────────────────

  function loadTickets() {
    if (!import.meta.client) return
    const stored = localStorage.getItem('app_tickets')
    if (stored) {
      try {
        allTickets.value = JSON.parse(stored)
        rebuildSalesCache(allTickets.value)
      } catch {
        allTickets.value = []
      }
    }
  }

  function saveTickets(tickets: Ticket[]) {
    if (!import.meta.client) return
    localStorage.setItem('app_tickets', JSON.stringify(tickets))
    rebuildSalesCache(tickets)
  }

  // ── init: carga tickets y construye caché de tipos/disponibilidad ────────────
  // Llamar una vez en onMounted desde el componente padre.

  function init() {
    loadTickets()
    _rebuildCaches()
  }

  function _rebuildCaches() {
    // Reconstruye availabilityCache a partir de tickets guardados
    const newAvail: Record<number, Record<string, number>> = {}

    for (const eventId of Object.keys(typesCache.value).map(Number)) {
      newAvail[eventId] = {}
      for (const tp of typesCache.value[eventId]) {
        const sold = allTickets.value.filter(
          t => t.eventId === eventId && t.type === tp.name
        ).length
        newAvail[eventId][tp.id] = Math.max(0, tp.available + tp.sold - sold)
      }
    }
    availabilityCache.value = newAvail
  }

  // ── getTypesForEvent ─────────────────────────────────────────────────────────
  // Devuelve los TicketType del evento. Si no están cacheados, genera los
  // predeterminados (General 80% / VIP 20%) basados en capacity y price.

  function getTypesForEvent(eventId: number): TicketType[] {
    return typesCache.value[eventId] ?? []
  }

  // Inicializa los tipos de un evento concreto (necesario antes de mostrar la card/modal).
  // Los componentes pueden llamarlo opcionalmente; si no existe en caché se genera.
  function ensureTypesForEvent(event: any): TicketType[] {
    if (typesCache.value[event.id_event]) return typesCache.value[event.id_event]

    const basePrice = Number(event.price) || 0
    const cap = Number(event.capacity) || 100
    const capGeneral = Math.floor(cap * 0.8)
    const capVIP = cap - capGeneral

    const soldForEvent = allTickets.value.filter(t => t.eventId === event.id_event)
    const soldGeneral = soldForEvent.filter(t => t.type === 'General').length
    const soldVIP = soldForEvent.filter(t => t.type === 'VIP').length

    const types: TicketType[] = [
      {
        id: `t_gen_${event.id_event}`,
        name: 'General',
        price: basePrice,
        available: Math.max(0, capGeneral - soldGeneral),
        sold: soldGeneral,
      },
      {
        id: `t_vip_${event.id_event}`,
        name: 'VIP',
        price: Math.round(basePrice * 1.5),
        available: Math.max(0, capVIP - soldVIP),
        sold: soldVIP,
      },
    ]

    typesCache.value[event.id_event] = types

    // Inicializa availability para este evento
    availabilityCache.value[event.id_event] = {}
    for (const tp of types) {
      availabilityCache.value[event.id_event][tp.id] = tp.available
    }

    return types
  }

  // ── getAvailability ──────────────────────────────────────────────────────────
  // Devuelve { [typeId]: cantidadDisponible } para un evento.

  function getAvailability(eventId: number): Record<string, number> {
    return availabilityCache.value[eventId] ?? {}
  }

  // ── purchaseTickets ──────────────────────────────────────────────────────────
  // Firma esperada por EventDetailModal:
  //   purchaseTickets(eventInfo, form) → { success, tickets?, error? }

  function purchaseTickets(
    eventInfo: { id_event: number; NameEvent: string; date_time: string | null; location: string },
    form: PurchaseForm
  ): { success: boolean; tickets?: Ticket[]; error?: string } {
    loadTickets()

    const types = typesCache.value[eventInfo.id_event] ?? []
    const avail = availabilityCache.value[eventInfo.id_event] ?? {}
    const newTickets: Ticket[] = []

    for (const item of form.types) {
      if (!item.quantity || item.quantity <= 0) continue

      const tp = types.find(t => t.id === item.typeId)
      if (!tp) return { success: false, error: 'Tipo de entrada no encontrado.' }

      const available = avail[item.typeId] ?? 0
      if (item.quantity > available) {
        return { success: false, error: `Solo quedan ${available} entradas de tipo "${tp.name}".` }
      }

      for (let i = 0; i < item.quantity; i++) {
        newTickets.push({
          id: generateId(),
          eventId: eventInfo.id_event,
          eventName: eventInfo.NameEvent,
          eventDate: eventInfo.date_time,
          eventLocation: eventInfo.location,
          type: tp.name,
          price: tp.price,
          qrCode: generateQr(eventInfo.id_event, tp.name, i + 1),
          purchasedAt: new Date().toISOString(),
          holderName: form.holderName,
        })
      }

      // Descuenta del caché de disponibilidad inmediatamente
      availabilityCache.value[eventInfo.id_event][item.typeId] = Math.max(
        0,
        available - item.quantity
      )
    }

    if (newTickets.length === 0) {
      return { success: false, error: 'Selecciona al menos una entrada.' }
    }

    const updated = [...allTickets.value, ...newTickets]
    allTickets.value = updated
    saveTickets(updated)

    return { success: true, tickets: newTickets }
  }

  // ── getUserTickets ───────────────────────────────────────────────────────────

  function getUserTickets(emailOrName: string): Ticket[] {
    loadTickets()
    return allTickets.value
      .filter(t => t.holderName.toLowerCase() === emailOrName.toLowerCase())
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
  }

  // ── API legacy (getTicketTypes / buyTickets) ─────────────────────────────────
  // Mantenidas para compatibilidad con cualquier otro componente que las use.

  async function getTicketTypes(event: any): Promise<TicketType[]> {
    loadTickets()
    return ensureTypesForEvent(event)
  }

  async function buyTickets(
    event: any,
    types: TicketType[],
    form: PurchaseForm
  ): Promise<{ success: boolean; tickets?: Ticket[]; error?: string }> {
    // Sincroniza tipos al caché antes de comprar
    if (!typesCache.value[event.id_event]) {
      typesCache.value[event.id_event] = types
    }
    return purchaseTickets(
      {
        id_event: event.id_event,
        NameEvent: event.NameEvent ?? event.eventName ?? event.name,
        date_time: event.date_time,
        location: event.location,
      },
      form
    )
  }

  return {
    // Nueva API (usada por EventCard y EventDetailModal)
    init,
    getTypesForEvent,
    getAvailability,
    purchaseTickets,
    ensureTypesForEvent,
    getTicketTypes,
    buyTickets,
    getUserTickets,
  }
}