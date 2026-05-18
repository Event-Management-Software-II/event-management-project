<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Reportes</h1>
    </div>

    <!-- ── Reporte de ventas por evento (acordeón) ───────────────────────── -->
    <div class="card">
      <div class="report-header">
        <span class="report-title">Ventas por evento</span>
      </div>
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width:32px"></th>
              <th>#</th>
              <th>Evento</th>
              <th>Categoría</th>
              <th>Total vendidos</th>
              <th>Ingresos totales</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingSales">
              <td colspan="6" class="td-loading">Cargando…</td>
            </tr>
            <tr v-else-if="salesByEvent.length === 0">
              <td colspan="6">
                <div class="empty-state">
                  <div class="empty-state-icon">🎟️</div>
                  <div class="empty-state-text">No hay datos de ventas aún.</div>
                </div>
              </td>
            </tr>
            <template v-for="(row, i) in salesByEvent" :key="row.id_event">
              <!-- fila principal del evento -->
              <tr
                class="event-row"
                :class="{ 'event-row--open': openEvents.has(row.id_event) }"
                @click="toggleEvent(row.id_event)"
              >
                <td class="td-toggle">
                  <span class="toggle-icon">
                    {{ openEvents.has(row.id_event) ? '▾' : '▸' }}
                  </span>
                </td>
                <td class="td-rank">
                  <span
                    :class="[
                      'rank-badge',
                      i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '',
                    ]"
                  >{{ i + 1 }}</span>
                </td>
                <td class="td-name">{{ row.event_name }}</td>
                <td style="font-size:0.85rem; color:var(--text-muted)">
                  {{ row.category_name }}
                </td>
                <td class="td-count">
                  <div class="bar-wrap">
                    <div
                      class="bar"
                      :style="{ width: salesBarWidth(row.total_sold) + '%' }"
                    ></div>
                    <span>{{ row.total_sold }}</span>
                  </div>
                </td>
                <td style="font-weight:700; font-size:0.88rem">
                  {{ formatCurrency(row.total_revenue) }}
                </td>
              </tr>

              <!-- detalle expandible por tipo de entrada -->
              <tr
                v-if="openEvents.has(row.id_event)"
                class="detail-row"
                :key="`detail-${row.id_event}`"
              >
                <td colspan="6" class="td-detail">
                  <table class="detail-table">
                    <thead>
                      <tr>
                        <th>Tipo de entrada</th>
                        <th>Disponibles</th>
                        <th>Vendidos</th>
                        <th>Restantes</th>
                        <th>Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="tt in row.ticket_types"
                        :key="tt.id_event_ticket"
                      >
                        <td class="tt-name">{{ tt.ticket_type_name }}</td>
                        <td>{{ tt.capacity }}</td>
                        <td>
                          <span class="sold-chip">{{ tt.tickets_sold }}</span>
                        </td>
                        <td
                          :class="tt.tickets_remaining === 0 ? 'td-agotado' : ''"
                        >
                          {{ tt.tickets_remaining === 0 ? 'Agotado' : tt.tickets_remaining }}
                        </td>
                        <td style="font-weight:600">
                          {{ formatCurrency(tt.revenue) }}
                        </td>
                      </tr>
                      <!-- total -->
                      <tr class="detail-total-row">
                        <td colspan="4" style="text-align:right; font-weight:700">
                          Total del evento
                        </td>
                        <td style="font-weight:800; color:var(--primary)">
                          {{ formatCurrency(row.total_revenue) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Ranking de interés ────────────────────────────────────────────── -->
    <div class="card" style="margin-top:24px">
      <div class="report-header">
        <span class="report-title">Ranking de interés por evento</span>
      </div>
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Evento</th>
              <th>Intereses</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingInterest">
              <td colspan="3" class="td-loading">Cargando…</td>
            </tr>
            <tr v-else-if="interestReport.length === 0">
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-state-icon">📊</div>
                  <div class="empty-state-text">No hay datos de interés aún.</div>
                </div>
              </td>
            </tr>
            <tr v-for="(row, i) in interestReport" :key="row['Event Name']">
              <td class="td-rank">
                <span
                  :class="[
                    'rank-badge',
                    i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '',
                  ]"
                >{{ i + 1 }}</span>
              </td>
              <td class="td-name">{{ row['Event Name'] }}</td>
              <td class="td-count">
                <div class="bar-wrap">
                  <div
                    class="bar"
                    :style="{ width: barWidth(row['Number of Interests']) + '%' }"
                  ></div>
                  <span>{{ row['Number of Interests'] }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Ranking de favoritos ──────────────────────────────────────────── -->
    <div class="card" style="margin-top:24px">
      <div class="report-header">
        <span class="report-title">Ranking de eventos favoritos</span>
      </div>
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Evento</th>
              <th>Favoritos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingFavorites">
              <td colspan="3" class="td-loading">Cargando…</td>
            </tr>
            <tr v-else-if="favoritesReport.length === 0">
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-state-icon">❤️</div>
                  <div class="empty-state-text">No hay datos de favoritos aún.</div>
                </div>
              </td>
            </tr>
            <tr v-for="(row, i) in favoritesReport" :key="row.event_name">
              <td class="td-rank">
                <span
                  :class="[
                    'rank-badge',
                    i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '',
                  ]"
                >{{ i + 1 }}</span>
              </td>
              <td class="td-name">{{ row.event_name }}</td>
              <td class="td-count">
                <div class="bar-wrap">
                  <div
                    class="bar bar--fav"
                    :style="{ width: favBarWidth(row.total_favorites) + '%' }"
                  ></div>
                  <span>{{ row.total_favorites }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const config = useRuntimeConfig();
const API = `${config.public.apiUrl}/api`;

interface SalesByEventRow {
  id_event: number;
  event_name: string;
  category_name: string;
  total_sold: number;
  total_revenue: number;
  ticket_types: {
    id_event_ticket: number;
    ticket_type_name: string;
    capacity: number;
    tickets_sold: number;
    tickets_remaining: number;
    revenue: number;
  }[];
}

interface InterestRow {
  'Event Name': string;
  'Number of Interests': number;
}

interface FavoritesRow {
  event_name: string;
  total_favorites: number;
}

const { restoreSession, authHeaders } = useAuth();

const salesByEvent = ref<SalesByEventRow[]>([]);
const interestReport = ref<InterestRow[]>([]);
const favoritesReport = ref<FavoritesRow[]>([]);

const loadingSales = ref(false);
const loadingInterest = ref(false);
const loadingFavorites = ref(false);

// acordeón: set de id_event abiertos
const openEvents = ref<Set<number>>(new Set());

function toggleEvent(id: number) {
  const s = new Set(openEvents.value);
  s.has(id) ? s.delete(id) : s.add(id);
  openEvents.value = s;
}

if (import.meta.server) {
  await navigateTo('/login');
}

onMounted(async () => {
  restoreSession();

  loadingSales.value = true;
  loadingInterest.value = true;
  loadingFavorites.value = true;

  const [salesRes, interestRes, favRes] = await Promise.allSettled([
    fetch(`${API}/admin/reports/sales-by-event`, { headers: authHeaders() }),
    fetch(`${API}/admin/reports/interests`, { headers: authHeaders() }),
    fetch(`${API}/admin/reports/favorites`, { headers: authHeaders() }),
  ]);

  if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
    const json = await salesRes.value.json();
    salesByEvent.value = json.ok ? json.data : [];
  }
  loadingSales.value = false;

  if (interestRes.status === 'fulfilled' && interestRes.value.ok) {
    interestReport.value = await interestRes.value.json();
  }
  loadingInterest.value = false;

  if (favRes.status === 'fulfilled' && favRes.value.ok) {
    const json = await favRes.value.json();
    favoritesReport.value = json.ok ? json.data : [];
  }
  loadingFavorites.value = false;
});

// ── helpers ────────────────────────────────────────────────────────────────────

const maxSold = computed(() =>
  salesByEvent.value.length
    ? Math.max(...salesByEvent.value.map((r) => r.total_sold))
    : 1
);
const maxInterests = computed(() =>
  interestReport.value.length
    ? Math.max(...interestReport.value.map((r) => r['Number of Interests']))
    : 1
);
const maxFavs = computed(() =>
  favoritesReport.value.length
    ? Math.max(...favoritesReport.value.map((r) => r.total_favorites))
    : 1
);

function salesBarWidth(n: number) {
  return Math.round((n / maxSold.value) * 100);
}
function barWidth(n: number) {
  return Math.round((n / maxInterests.value) * 100);
}
function favBarWidth(n: number) {
  return Math.round((n / maxFavs.value) * 100);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<style scoped>
.report-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.report-title {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.table-scroll {
  overflow-x: auto;
}
.td-loading {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
}
.td-rank {
  width: 48px;
  text-align: center;
}
.td-name {
  font-weight: 600;
  font-size: 0.88rem;
}
.td-count {
  min-width: 160px;
}
.td-toggle {
  width: 32px;
  text-align: center;
  cursor: pointer;
}
.toggle-icon {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* fila de evento clickeable */
.event-row {
  cursor: pointer;
  transition: background 0.15s;
}
.event-row:hover {
  background: var(--bg-elevated, #f7f8fa);
}
.event-row--open {
  background: var(--primary-pale, #e8f4f5);
}

/* fila de detalle */
.td-detail {
  padding: 0 !important;
  background: var(--bg-elevated, #f7f8fa);
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.detail-table th {
  padding: 8px 14px;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: #eef1f5;
  border-bottom: 1px solid var(--border);
}
.detail-table td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
}
.detail-total-row td {
  background: #e8f4f5;
  font-size: 0.88rem;
}
.tt-name {
  font-weight: 600;
}
.sold-chip {
  display: inline-block;
  background: var(--primary-light, #c8e6ea);
  color: var(--primary, #34656d);
  border-radius: 12px;
  padding: 2px 10px;
  font-weight: 700;
  font-size: 0.8rem;
}
.td-agotado {
  color: #e74c3c;
  font-weight: 700;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 800;
  background: var(--bg-elevated);
  color: var(--text-muted);
}
.rank-badge.gold   { background: #fef9c3; color: #b45309; }
.rank-badge.silver { background: #f1f5f9; color: #5e718d; }
.rank-badge.bronze { background: #fff7ed; color: #c2410c; }

.bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar {
  height: 8px;
  background: var(--primary-light, #c8e6ea);
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 4px;
}
.bar--fav {
  background: #fecdd3;
}
</style>