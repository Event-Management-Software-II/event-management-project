// composables/useTickets.ts
// Backend aún no implementado — toda la lógica vive en localStorage + caché en memoria
import { ref, onMounted } from 'vue'

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
// ────────────────────────────────────────────────────────────────────────────

export function useTickets() {
  const allTickets = ref<Ticket[]>([])

  function loadTickets() {
    if (!import.meta.client) return
    const stored = localStorage.getItem('app_tickets')
    if (stored) {
      allTickets.value = JSON.parse(stored)
      rebuildSalesCache(allTickets.value)
    }
  }

  function saveTickets(tickets: Ticket[]) {
    if (!import.meta.client) return
    localStorage.setItem('app_tickets', JSON.stringify(tickets))
    rebuildSalesCache(tickets)
  }

  // Generadores dummy
  const generateId = () => Math.random().toString(36).substring(2, 10)
  const generateQr = (eventId: number, typeName: string, seq: number) =>
    `QR-${eventId}-${typeName.toUpperCase()}-${seq}-${Date.now()}`

  // Retorna entradas predeterminadas para un evento basándose en su capacidad/precio
  async function getTicketTypes(event: any): Promise<TicketType[]> {
    loadTickets()
    const soldForEvent = allTickets.value.filter(t => t.eventId === event.id_event)

    const soldGeneral = soldForEvent.filter(t => t.type === 'General').length
    const soldVIP     = soldForEvent.filter(t => t.type === 'VIP').length

    const basePrice = Number(event.value) || 0
    const cap       = Number(event.capacity) || 100 // default si no hay capacidad definida

    // Distribución inventada: 80% General, 20% VIP
    const capGeneral = Math.floor(cap * 0.8)
    const capVIP     = cap - capGeneral

    return [
      {
        id: 't_gen',
        name: 'General',
        price: basePrice,
        available: Math.max(0, capGeneral - soldGeneral),
        sold: soldGeneral,
      },
      {
        id: 't_vip',
        name: 'VIP',
        price: basePrice * 1.5,
        available: Math.max(0, capVIP - soldVIP),
        sold: soldVIP,
      },
    ]
  }

  async function buyTickets(
    event: any,
    types: TicketType[],
    form: PurchaseForm
  ): Promise<{ success: boolean; tickets?: Ticket[]; error?: string }> {
    loadTickets()
    const newTickets: Ticket[] = []

    // Verificar disponibilidad actual en todo el sistema (solo en memoria)
    const availability: Record<string, number> = {}
    for (const t of types) {
      const sold = allTickets.value.filter(tx => tx.eventId === event.id_event && tx.type === t.name).length
      const totalCap = t.available + t.sold
      availability[t.id] = totalCap - sold
    }

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
          // MAPEO: Corregido NameEvent (que no existía) a eventName o name
          eventName: event.eventName || event.name,
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

  function getUserTickets(emailOrName: string) {
    loadTickets()
    // Simplificación: busca por holderName exacto (en app real buscaría por id_user)
    return allTickets.value.filter(
      t => t.holderName.toLowerCase() === emailOrName.toLowerCase()
    ).sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
  }

  onMounted(() => {
    loadTickets()
  })

  return {
    getTicketTypes,
    buyTickets,
    getUserTickets,
  }
}