import { ref } from 'vue';

const API = 'http://localhost:3001/api';

// ── Tipos (RF-008.1) ───────────────────────────────────────────────────────────

export interface ActiveEventItem {
  id_event: number;
  eventName: string;
}

export interface CompletedEventItem {
  id_event: number;
  eventName: string;
  date_time: string;
}

export interface ActiveEventDetail {
  id_event: number;
  eventName: string;
  date_time: string;
  tickets_sold: number;
  capacity: number;
  progress: number; // 0-100
}

export interface MonthlyRevenue {
  label: string;   // e.g. "Ene 2026"
  revenue: number;
}

export interface AdminHomeStats {
  total_revenue: number;
  active_events: {
    count: number;
    items: ActiveEventItem[];
  };
  completed_events: {
    count: number;
    items: CompletedEventItem[];
  };
  registered_users: number;
  active_events_detail: ActiveEventDetail[];
  monthly_revenue: MonthlyRevenue[];
}

// ── Estado singleton ───────────────────────────────────────────────────────────

const stats = ref<AdminHomeStats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// ── Composable ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  const { authHeaders } = useAuth();

  async function fetchStats(force = false): Promise<void> {
    if (stats.value && !force) return;

    loading.value = true;
    error.value = null;

    try {
      const res = await fetch(`${API}/admin/reports/home-stats`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      stats.value = json.ok ? json.data : null;
    } catch (err) {
      console.error('[useDashboard] Error:', err);
      error.value = 'No se pudieron cargar las estadísticas del panel.';
    } finally {
      loading.value = false;
    }
  }

  function invalidate(): void {
    stats.value = null;
  }

  return { stats, loading, error, fetchStats, invalidate };
}