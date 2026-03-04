<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Reportes</h1>
    </div>

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
            <tr v-if="loading">
              <td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted)">Cargando…</td>
            </tr>
            <tr v-else-if="report.length === 0">
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-state-icon">📊</div>
                  <div class="empty-state-text">No hay datos de interés aún.</div>
                </div>
              </td>
            </tr>
            <tr v-for="(row, i) in report" :key="row['Event Name']">
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const API = 'http://localhost:3001/api'

interface ReportRow {
  'Event Name': string
  'Number of Interests': number
}

const { restoreSession, authHeaders } = useAuth()

const report  = ref<ReportRow[]>([])
const loading = ref(false)

onMounted(async () => {
  restoreSession()
  loading.value = true
  try {
    const res = await fetch(`${API}/admin/reports/interests`, {
      headers: authHeaders(),
    })
    if (res.ok) report.value = await res.json()
  } finally {
    loading.value = false
  }
})

const maxInterests = computed(() =>
  report.value.length ? Math.max(...report.value.map(r => r['Number of Interests'])) : 1
)

function barWidth(count: number): number {
  return Math.round((count / maxInterests.value) * 100)
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