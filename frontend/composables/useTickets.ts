import { ref } from 'vue';

export interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  sold: number;
}

export interface Ticket {
  id: string;
  eventId: number;
  eventName: string;
  eventDate: string | null;
  eventLocation: string;
  type: string;
  price: number;
  qrCode: string;
  purchasedAt: string;
  holderName: string;
}

export interface PurchaseForm {
  types: { typeId: string; quantity: number }[];
  holderName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isEventActive(date_time: string | null): boolean {
  if (!date_time) return true;
  const eventEnd = new Date(date_time);
  eventEnd.setDate(eventEnd.getDate() + 1);
  return eventEnd > new Date();
}

// ── Caché en memoria (compartida entre instancias) ────────────────────────────

// eventId → TicketType[]
const typesCache = ref<Record<number, TicketType[]>>({});
// eventId → { typeId → disponibles }
const availabilityCache = ref<Record<number, Record<string, number>>>({});

const generateId = () => Math.random().toString(36).substring(2, 10);
const generateQr = (eventId: number, typeName: string, seq: number) =>
  `QR-${eventId}-${typeName.toUpperCase()}-${seq}-${Date.now()}`;

// ── Caché de ventas para top eventos ─────────────────────────────────────────

const salesCache = ref<Record<number, number>>({});

function rebuildSalesCache(tickets: Ticket[]) {
  const map: Record<number, number> = {};
  for (const t of tickets) {
    map[t.eventId] = (map[t.eventId] ?? 0) + 1;
  }
  salesCache.value = map;
}

export function useTopEvents(activeEventIds: number[]) {
  const topEventIds = ref<number[]>([]);

  function updateTop() {
    const sorted = Object.entries(salesCache.value)
      .map(([idStr, count]) => ({ id: Number(idStr), count }))
      .filter((item) => activeEventIds.includes(item.id))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    topEventIds.value = sorted.map((s) => s.id);
  }

  return { topEventIds, updateTop };
}

// ── Composable principal ──────────────────────────────────────────────────────

export function useTickets() {
  const config = useRuntimeConfig();
  const API = `${config.public.apiUrl}/api`;

  const allTickets = ref<Ticket[]>([]);

  // ── Persistencia ────────────────────────────────────────────────────────────

  function loadTickets() {
    if (!import.meta.client) return;
    const stored = localStorage.getItem('app_tickets');
    if (stored) {
      try {
        allTickets.value = JSON.parse(stored);
        rebuildSalesCache(allTickets.value);
      } catch {
        allTickets.value = [];
      }
    }
  }

  function saveTickets(tickets: Ticket[]) {
    if (!import.meta.client) return;
    localStorage.setItem('app_tickets', JSON.stringify(tickets));
    rebuildSalesCache(tickets);
  }

  // ── init: carga tickets y construye caché de tipos/disponibilidad ────────────
  // Llamar una vez en onMounted desde el componente padre.

  function init() {
    loadTickets();
    _rebuildCaches();
  }

  function _rebuildCaches() {
    // Reconstruye availabilityCache a partir de tickets guardados
    const newAvail: Record<number, Record<string, number>> = {};

    for (const eventId of Object.keys(typesCache.value).map(Number)) {
      newAvail[eventId] = {};
      for (const tp of typesCache.value[eventId]) {
        const sold = allTickets.value.filter(
          (t) => t.eventId === eventId && t.type === tp.name
        ).length;
        newAvail[eventId][tp.id] = Math.max(0, tp.available + tp.sold - sold);
      }
    }
    availabilityCache.value = newAvail;
  }

  // ── getTypesForEvent ─────────────────────────────────────────────────────────
  // Devuelve los TicketType del evento. Si no están cacheados, genera los
  // predeterminados (General 80% / VIP 20%) basados en capacity y price.

  function getTypesForEvent(eventId: number): TicketType[] {
    return typesCache.value[eventId] ?? [];
  }

  // Carga los tipos reales desde la API y los almacena en caché.
  // Usa los id_event_ticket reales de la BD como id del TicketType.
  async function ensureTypesForEvent(event: any): Promise<TicketType[]> {
    if (typesCache.value[event.id_event])
      return typesCache.value[event.id_event];

    const API = `${config.public.apiUrl}/api`;
    try {
      const res = await fetch(`${API}/events/${event.id_event}/ticket-types`);
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.data)) return [];

      const types: TicketType[] = json.data.map((tt: any) => ({
        id: String(tt.id_event_ticket), // ID numérico real de la BD
        name: tt.typeName,
        price: tt.price,
        available: tt.tickets_remaining,
        sold: tt.tickets_sold,
      }));

      typesCache.value[event.id_event] = types;
      availabilityCache.value[event.id_event] = {};
      for (const tp of types) {
        availabilityCache.value[event.id_event][tp.id] = tp.available;
      }
      return types;
    } catch {
      return [];
    }
  }

  // ── getAvailability ──────────────────────────────────────────────────────────
  // Devuelve { [typeId]: cantidadDisponible } para un evento.

  function getAvailability(eventId: number): Record<string, number> {
    return availabilityCache.value[eventId] ?? {};
  }

  // ── purchaseTickets ──────────────────────────────────────────────────────────
  // Llama al backend (POST /api/purchases) por cada tipo en el carrito.

  async function purchaseTickets(
    eventInfo: {
      id_event: number;
      NameEvent: string;
      date_time: string | null;
      location: string;
    },
    form: PurchaseForm
  ): Promise<{ success: boolean; tickets?: Ticket[]; error?: string }> {
    const { authHeaders } = useAuth();
    const API = `${config.public.apiUrl}/api`;
    const newTickets: Ticket[] = [];

    for (const item of form.types) {
      if (!item.quantity || item.quantity <= 0) continue;

      const types = typesCache.value[eventInfo.id_event] ?? [];
      const tp = types.find((t) => t.id === item.typeId);
      if (!tp)
        return { success: false, error: 'Tipo de entrada no encontrado.' };

      try {
        const res = await fetch(`${API}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            id_event_ticket: Number(item.typeId),
            quantity: item.quantity,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? 'Error al procesar la compra.',
          };
        }

        for (let i = 0; i < item.quantity; i++) {
          newTickets.push({
            id: String(data.purchaseId),
            eventId: eventInfo.id_event,
            eventName: eventInfo.NameEvent,
            eventDate: eventInfo.date_time,
            eventLocation: eventInfo.location,
            type: tp.name,
            price: tp.price,
            qrCode: generateQr(eventInfo.id_event, tp.name, i + 1),
            purchasedAt: new Date().toISOString(),
            holderName: form.holderName,
          });
        }

        // Actualizar disponibilidad local
        const avail = availabilityCache.value[eventInfo.id_event] ?? {};
        availabilityCache.value[eventInfo.id_event] = {
          ...avail,
          [item.typeId]: Math.max(0, (avail[item.typeId] ?? 0) - item.quantity),
        };
      } catch {
        return {
          success: false,
          error: 'No se pudo conectar con el servidor.',
        };
      }
    }

    if (newTickets.length === 0) {
      return { success: false, error: 'Selecciona al menos una entrada.' };
    }

    return { success: true, tickets: newTickets };
  }

  // ── getUserTickets ───────────────────────────────────────────────────────────

  function getUserTickets(emailOrName: string): Ticket[] {
    loadTickets();
    return allTickets.value
      .filter((t) => t.holderName.toLowerCase() === emailOrName.toLowerCase())
      .sort(
        (a, b) =>
          new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
      );
  }

  // ── API legacy (getTicketTypes / buyTickets) ─────────────────────────────────
  // Mantenidas para compatibilidad con cualquier otro componente que las use.

  async function getTicketTypes(event: any): Promise<TicketType[]> {
    return ensureTypesForEvent(event);
  }

  async function buyTickets(
    event: any,
    types: TicketType[],
    form: PurchaseForm
  ): Promise<{ success: boolean; tickets?: Ticket[]; error?: string }> {
    // Sincroniza tipos al caché antes de comprar
    if (!typesCache.value[event.id_event]) {
      await ensureTypesForEvent(event);
    }
    return purchaseTickets(
      {
        id_event: event.id_event,
        NameEvent: event.NameEvent ?? event.eventName ?? event.name,
        date_time: event.date_time,
        location: event.location,
      },
      form
    );
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
  };
}
