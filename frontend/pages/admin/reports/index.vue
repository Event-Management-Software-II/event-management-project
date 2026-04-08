<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Reportes</h1>
    </div>

    <!-- Ranking de interés -->
    <div class="card">
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
              <td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted)">Cargando…</td>
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
                <span :class="['rank-badge', i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '']">
                  {{ i + 1 }}
                </span>
              </td>
              <td class="td-name">{{ row['Event Name'] }}</td>
              <td class="td-count">
                <div class="bar-wrap">
                  <div class="bar" :style="{ width: barWidth(row['Number of Interests']) + '%' }"></div>
                  <span>{{ row['Number of Interests'] }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ranking de ventas -->
    <div class="card" style="margin-top:24px">
      <div class="report-header">
        <span class="report-title">Ranking de ventas por evento</span>
      </div>
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Evento</th>
              <th>Categoría</th>
              <th>Tipo de ticket</th>
              <th>Vendidos</th>
              <th>Disponibles</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingSales">
              <td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">Cargando…</td>
            </tr>
            <tr v-else-if="salesReport.length === 0">
              <td colspan="7">
                <div class="empty-state">
                  <div class="empty-state-icon">🎟️</div>
                  <div class="empty-state-text">No hay datos de ventas aún.</div>
                </div>
              </td>
            </tr>
            <tr v-for="(row, i) in salesReport" :key="`${row.id_event}-${row.ticket_type_name}`">
              <td class="td-rank">
                <span :class="['rank-badge', i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '']">
                  {{ i + 1 }}
                </span>
              </td>
              <td class="td-name">{{ row.event_name }}</td>
              <td style="font-size:.85rem;color:var(--text-muted)">{{ row.category_name }}</td>
              <td style="font-size:.85rem">{{ row.ticket_type_name }}</td>
              <td class="td-count">
                <div class="bar-wrap">
                  <div class="bar" :style="{ width: salesBarWidth(row.tickets_sold) + '%' }"></div>
                  <span>{{ row.tickets_sold }}</span>
                </div>
              </td>
              <td style="font-size:.85rem;color:var(--text-muted)">{{ row.tickets_remaining }}</td>
              <td style="font-weight:700;font-size:.88rem">{{ formatCurrency(row.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const API = 'http://localhost:3001/api'

interface InterestRow {
  'Event Name': string
  'Number of Interests': number
}

interface SalesRow {
  id_event:          number
  event_name:        string
  category_name:     string
  ticket_type_name:  string
  capacity:          number
  tickets_sold:      number
  tickets_remaining: number
  revenue:           number
}

const { restoreSession, authHeaders } = useAuth()

const interestReport = ref<InterestRow[]>([])
const salesReport    = ref<SalesRow[]>([])
const loadingInterest = ref(false)
const loadingSales    = ref(false)

if (import.meta.server) {
  await navigateTo('/login')
}

onMounted(async () => {
  restoreSession()

  loadingInterest.value = true
  loadingSales.value    = true

  const [interestRes, salesRes] = await Promise.allSettled([
    fetch(`${API}/admin/reports/interests`, { headers: authHeaders() }),
    fetch(`${API}/admin/reports/sales`,     { headers: authHeaders() }),
  ])

  if (interestRes.status === 'fulfilled' && interestRes.value.ok) {
    interestReport.value = await interestRes.value.json()
  }
  loadingInterest.value = false

  if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
    const json = await salesRes.value.json()
    salesReport.value = json.ok ? json.data : []
  }
  loadingSales.value = false
})

const maxInterests = computed(() =>
  interestReport.value.length ? Math.max(...interestReport.value.map(r => r['Number of Interests'])) : 1
)

const maxSales = computed(() =>
  salesReport.value.length ? Math.max(...salesReport.value.map(r => r.tickets_sold)) : 1
)

function barWidth(count: number): number {
  return Math.round((count / maxInterests.value) * 100)
}

function salesBarWidth(count: number): number {
  return Math.round((count / maxSales.value) * 100)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}
</script>

<style scoped>
.report-header { padding:14px 20px; border-bottom:1px solid var(--border); }
.report-title  { font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); }
.table-scroll  { overflow-x:auto; }
.td-rank  { width:48px; text-align:center; }
.td-name  { font-weight:600; font-size:.88rem; }
.td-count { min-width:160px; }
.rank-badge { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; font-size:.75rem; font-weight:800; background:var(--bg-elevated); color:var(--text-muted); }
.rank-badge.gold   { background:#fef9c3; color:#b45309; }
.rank-badge.silver { background:#f1f5f9; color:#5e718d; }
.rank-badge.bronze { background:#fff7ed; color:#c2410c; }
.bar-wrap { display:flex; align-items:center; gap:10px; }
.bar { height:8px; background:var(--primary-light); border-radius:4px; transition:width .4s ease; min-width:4px; }
</style>