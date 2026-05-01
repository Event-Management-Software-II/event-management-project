<template>
  <div class="dash">
    <div class="dash-header">
      <h1 class="dash-title">Dashboard Admin</h1>
    </div>

    <!-- Error global -->
    <div v-if="error" class="dash-error" role="alert">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Fila de 4 KPI ─────────────────────────────────────────────────── -->
    <div class="kpi-row">

      <!-- Total de Ganancias -->
      <div class="kpi-card kpi-card--revenue">
        <p class="kpi-label">Total de Ganancias</p>
        <div v-if="loading" class="kpi-skeleton kpi-skeleton--value" />
        <div v-else class="kpi-revenue">
          {{ formatCurrency(stats?.total_revenue ?? 0) }}
          <span class="kpi-currency">COP</span>
        </div>
        <p v-if="!loading" class="kpi-trend">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 17l5-5 4 4 9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Positivo
        </p>
      </div>

      <!-- Eventos Activos -->
      <div class="kpi-card">
        <div class="kpi-card-head">
          <p class="kpi-label">Eventos Activos</p>
          <span class="kpi-badge kpi-badge--blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 11l9-9 9 9v10a1 1 0 01-1 1H4a1 1 0 01-1-1V11z" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </span>
        </div>
        <div v-if="loading" class="kpi-skeleton kpi-skeleton--count" />
        <p v-else class="kpi-count">{{ stats?.active_events.count ?? 0 }}</p>
        <div class="kpi-divider" />
        <div class="kpi-list">
          <template v-if="loading">
            <div v-for="i in 4" :key="i" class="kpi-skeleton kpi-skeleton--line" />
          </template>
          <template v-else-if="stats?.active_events.items.length">
            <div
              v-for="(ev, i) in stats.active_events.items.slice(0, 5)"
              :key="ev.id_event"
              class="kpi-list-item"
              :class="{ 'kpi-list-item--bordered': i < Math.min(stats.active_events.items.length, 5) - 1 }"
            >{{ ev.eventName }}</div>
            <p v-if="stats.active_events.count > 5" class="kpi-more">+{{ stats.active_events.count - 5 }} más</p>
          </template>
          <p v-else class="kpi-empty">Sin eventos activos</p>
        </div>
      </div>

      <!-- Eventos Pasados -->
      <div class="kpi-card">
        <div class="kpi-card-head">
          <p class="kpi-label">Eventos Pasados</p>
          <span class="kpi-badge kpi-badge--orange">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
        </div>
        <div v-if="loading" class="kpi-skeleton kpi-skeleton--count" />
        <p v-else class="kpi-count">{{ stats?.completed_events.count ?? 0 }}</p>
        <div class="kpi-divider" />
        <div class="kpi-past-table">
          <template v-if="loading">
            <div v-for="i in 4" :key="i" class="kpi-skeleton kpi-skeleton--line" />
          </template>
          <template v-else-if="stats?.completed_events.items.length">
            <div class="kpi-past-head">
              <span>Nombre del Evento</span><span>Fecha</span>
            </div>
            <div v-for="ev in stats.completed_events.items.slice(0, 4)" :key="ev.id_event" class="kpi-past-row">
              <span>{{ ev.eventName }}</span>
              <span>{{ formatDate(ev.date_time) }}</span>
            </div>
            <p v-if="stats.completed_events.count > 4" class="kpi-more">+{{ stats.completed_events.count - 4 }} más</p>
          </template>
          <p v-else class="kpi-empty">Sin eventos pasados</p>
        </div>
      </div>

      <!-- Usuarios Registrados -->
      <div class="kpi-card">
        <div class="kpi-card-head">
          <p class="kpi-label">Usuarios Registrados</p>
          <span class="kpi-badge kpi-badge--teal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
        </div>
        <div v-if="loading" class="kpi-skeleton kpi-skeleton--count" />
        <p v-else class="kpi-count">{{ (stats?.registered_users ?? 0).toLocaleString('es-CO') }}</p>
        <p class="kpi-note">(excluyendo admins)</p>
      </div>
    </div>

    <!-- ── Fila inferior: gráfico + tabla detallada ───────────────────────── -->
    <div class="bottom-row">

      <!-- Gráfico de Ingresos Mensuales -->
      <div class="card">
        <p class="card-title">Gráfico de Ingresos Mensuales</p>
        <div class="chart-wrap">
          <template v-if="loading">
            <div class="chart-skeleton" />
          </template>
          <template v-else-if="stats?.monthly_revenue?.length">
            <!-- Eje Y -->
            <div class="chart-y-axis">
              <span v-for="tick in yTicks" :key="tick">{{ formatShort(tick) }}</span>
            </div>
            <!-- Barras -->
            <div class="chart-bars">
              <div
                v-for="m in stats.monthly_revenue"
                :key="m.label"
                class="chart-col"
              >
                <div class="chart-bar-wrap">
                  <div
                    class="chart-bar"
                    :style="{ height: barHeight(m.revenue) + '%' }"
                    :title="`${m.label}: ${formatCurrency(m.revenue)}`"
                  />
                </div>
                <span class="chart-label">{{ m.label }}</span>
              </div>
            </div>
          </template>
          <p v-else class="kpi-empty" style="padding: 32px 0; text-align:center">Sin datos de ingresos</p>
        </div>
      </div>

      <!-- Lista Detallada de Eventos Activos -->
      <div class="card">
        <p class="card-title">Lista Detallada de Eventos Activos</p>
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Fecha Inicio</th>
                <th>Entradas Vendidas</th>
                <th>Progreso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="td-center">
                  <div class="kpi-skeleton kpi-skeleton--line" style="width:80%;margin:16px auto" />
                </td>
              </tr>
              <tr v-else-if="!stats?.active_events_detail?.length">
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No hay eventos activos</div>
                  </div>
                </td>
              </tr>
              <tr v-for="ev in stats?.active_events_detail" :key="ev.id_event">
                <td class="td-name">{{ ev.eventName }}</td>
                <td class="td-date">{{ formatDate(ev.date_time) }}</td>
                <td class="td-sold">{{ ev.tickets_sold }}</td>
                <td class="td-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: ev.progress + '%' }" />
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="statusClass(ev.progress)">
                    {{ statusLabel(ev.progress) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const { restoreSession } = useAuth();
const { stats, loading, error, fetchStats } = useDashboard();

if (import.meta.server) {
  await navigateTo('/login');
}

onMounted(async () => {
  restoreSession();
  await fetchStats();
});

// ── Formato ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShort(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000)     return (value / 1_000).toFixed(0) + 'k';
  return String(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr));
}

// ── Gráfico de barras ──────────────────────────────────────────────────────────

const maxRevenue = computed(() => {
  if (!stats.value?.monthly_revenue?.length) return 1;
  return Math.max(...stats.value.monthly_revenue.map((m) => m.revenue), 1);
});

const yTicks = computed(() => {
  const max = maxRevenue.value;
  const step = Math.ceil(max / 4 / 100_000) * 100_000 || 100_000;
  const ticks = [];
  for (let i = 4; i >= 0; i--) ticks.push(i * step);
  return ticks;
});

function barHeight(revenue: number): number {
  return Math.round((revenue / maxRevenue.value) * 100);
}

// ── Estado de evento ───────────────────────────────────────────────────────────

function statusLabel(progress: number): string {
  if (progress >= 90) return 'Casi lleno';
  if (progress >= 50) return 'En progreso';
  if (progress > 0)   return 'Iniciado';
  return 'Sin ventas';
}

function statusClass(progress: number): string {
  if (progress >= 90) return 'status--red';
  if (progress >= 50) return 'status--orange';
  if (progress > 0)   return 'status--green';
  return 'status--gray';
}
</script>

<style scoped>
/* ── Layout general ── */
.dash { display: flex; flex-direction: column; gap: 20px; }
.dash-header { display: flex; align-items: center; justify-content: space-between; }
.dash-title { font-size: 1.35rem; font-weight: 800; color: var(--text-primary); }
.dash-error { display: flex; align-items: center; gap: 8px; background: var(--danger-pale); border: 1px solid var(--danger-border); border-radius: var(--radius-md); color: var(--danger); font-size: 0.84rem; padding: 10px 14px; }

/* ── KPIs ── */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: start; }
.kpi-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; gap: 6px; min-height: 200px; }
.kpi-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
.kpi-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.055em; color: var(--text-muted); }
.kpi-badge { width: 34px; height: 34px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kpi-badge--blue   { background: #dbeafe; color: #1d4ed8; }
.kpi-badge--orange { background: #ffedd5; color: #ea580c; }
.kpi-badge--teal   { background: #ccfbf1; color: #0f766e; }
.kpi-count { font-size: 2.4rem; font-weight: 800; color: var(--text-primary); line-height: 1; margin: 4px 0; }
.kpi-card--revenue { gap: 8px; }
.kpi-revenue { font-size: 1.9rem; font-weight: 800; color: var(--primary); line-height: 1.1; display: flex; align-items: baseline; gap: 6px; }
.kpi-currency { font-size: 0.95rem; font-weight: 600; color: var(--text-muted); }
.kpi-trend { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; font-weight: 600; color: #16a34a; }
.kpi-divider { height: 1px; background: var(--border); margin: 6px 0 4px; }
.kpi-list { display: flex; flex-direction: column; flex: 1; }
.kpi-list-item { font-size: 0.82rem; color: var(--text-secondary); padding: 7px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-list-item--bordered { border-bottom: 1px solid var(--border); }
.kpi-past-table { display: flex; flex-direction: column; flex: 1; }
.kpi-past-head { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 4px 0 6px; border-bottom: 1px solid var(--border); margin-bottom: 2px; }
.kpi-past-head span { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.kpi-past-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border); align-items: center; }
.kpi-past-row:last-of-type { border-bottom: none; }
.kpi-past-row span:first-child { font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-past-row span:last-child { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; }
.kpi-note { font-size: 0.77rem; color: var(--text-muted); margin-top: 2px; }
.kpi-more { font-size: 0.75rem; color: var(--text-muted); padding-top: 6px; }
.kpi-empty { font-size: 0.78rem; color: var(--text-muted); font-style: italic; padding-top: 8px; }

/* ── Skeletons ── */
.kpi-skeleton { background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
.kpi-skeleton--value { height: 36px; width: 75%; margin: 4px 0; }
.kpi-skeleton--count { height: 48px; width: 60px; margin: 4px 0; }
.kpi-skeleton--line  { height: 14px; width: 100%; margin: 5px 0; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Fila inferior ── */
.bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ── Card genérica (gráfico + tabla) ── */
.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.card-title { font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }

/* ── Gráfico de barras ── */
.chart-wrap { display: flex; gap: 0; padding: 16px 20px 12px; height: 240px; align-items: flex-end; }
.chart-skeleton { width: 100%; height: 100%; background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 10px; height: 100%; flex-shrink: 0; }
.chart-y-axis span { font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; }
.chart-bars { display: flex; align-items: flex-end; gap: 8px; flex: 1; height: 100%; }
.chart-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; gap: 6px; }
.chart-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.chart-bar { width: 100%; background: var(--primary-light); border-radius: 4px 4px 0 0; transition: height 0.4s ease; min-height: 4px; cursor: pointer; }
.chart-bar:hover { background: var(--primary); }
.chart-label { font-size: 0.65rem; color: var(--text-muted); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }

/* ── Tabla detallada ── */
.table-scroll { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
.admin-table th { background: var(--bg-elevated); padding: 10px 16px; text-align: left; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
.admin-table td { padding: 11px 16px; border-bottom: 1px solid var(--border); color: var(--text-secondary); vertical-align: middle; }
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover td { background: var(--bg-elevated); }
.td-center { text-align: center; padding: 24px; }
.td-name { font-weight: 600; font-size: 0.84rem; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-date { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
.td-sold { font-weight: 700; }
.td-progress { min-width: 100px; }
.empty-state { padding: 40px 20px; text-align: center; }
.empty-state-icon { font-size: 2rem; margin-bottom: 8px; }
.empty-state-text { font-size: 0.84rem; color: var(--text-muted); }

/* ── Progress bar ── */
.progress-bar { width: 100%; height: 7px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary-light); border-radius: 4px; transition: width 0.4s ease; min-width: 3px; }

/* ── Status badge ── */
.status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.73rem; font-weight: 700; white-space: nowrap; }
.status--red    { background: #fee2e2; color: #b91c1c; }
.status--orange { background: #ffedd5; color: #c2410c; }
.status--green  { background: #dcfce7; color: #15803d; }
.status--gray   { background: var(--bg-elevated); color: var(--text-muted); }

/* ── Responsive ── */
@media (max-width: 1200px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px)  { .bottom-row { grid-template-columns: 1fr; } }
@media (max-width: 640px)  { .kpi-row { grid-template-columns: 1fr; } }
</style>