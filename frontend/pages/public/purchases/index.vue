<template src="./static/structure/structure.html"></template>

<script setup lang="ts">
const config = useRuntimeConfig();
const API = `${config.public.apiUrl}/api`;
definePageMeta({ layout: false });

if (import.meta.server) {
  await navigateTo('/login');
}

const { user, logout, authHeaders } = useAuth();
const dropdownOpen = ref(false);

const purchases = ref<any[]>([]);
const loading = ref(false);
const openIds = ref<Set<number>>(new Set());

function toggleOpen(id: number) {
  const s = new Set(openIds.value);
  s.has(id) ? s.delete(id) : s.add(id);
  openIds.value = s;
}

// ── QR Code (mismo que TicketSuccessModal) ────────────────────────────────────
import { defineComponent, h } from 'vue';
const QrCode = defineComponent({
  props: {
    value: { type: String, required: true },
    size: { type: Number, default: 80 },
  },
  setup(props) {
    return () => {
      const s = props.size;
      const cells = 10;
      const cell = s / cells;
      let hash = 5381;
      for (let i = 0; i < props.value.length; i++) {
        hash = ((hash << 5) + hash) ^ props.value.charCodeAt(i);
        hash = hash >>> 0;
      }
      const rects: any[] = [];
      for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
          const seed = hash ^ (row * 2654435761) ^ (col * 1013904223);
          if ((seed >>> 0) % 3 === 0)
            rects.push(
              h('rect', {
                x: col * cell,
                y: row * cell,
                width: cell - 0.5,
                height: cell - 0.5,
                fill: '#1a2332',
                rx: 0.5,
              })
            );
        }
      }
      const corner = (cx: number, cy: number) => [
        h('rect', {
          x: cx,
          y: cy,
          width: cell * 3,
          height: cell * 3,
          fill: '#1a2332',
          rx: 2,
        }),
        h('rect', {
          x: cx + cell * 0.8,
          y: cy + cell * 0.8,
          width: cell * 1.4,
          height: cell * 1.4,
          fill: 'white',
          rx: 1,
        }),
        h('rect', {
          x: cx + cell * 1.1,
          y: cy + cell * 1.1,
          width: cell * 0.8,
          height: cell * 0.8,
          fill: '#1a2332',
          rx: 0.5,
        }),
      ];
      return h(
        'svg',
        {
          width: s,
          height: s,
          viewBox: `0 0 ${s} ${s}`,
          style: 'display:block',
        },
        [
          h('rect', { width: s, height: s, fill: 'white', rx: 4 }),
          ...rects,
          ...corner(0, 0),
          ...corner(s - cell * 3, 0),
          ...corner(0, s - cell * 3),
        ]
      );
    };
  },
});

onMounted(async () => {
  loading.value = true;
  try {
    const res = await fetch(`${API}/purchases`, {
      headers: { ...authHeaders(), 'Cache-Control': 'no-cache' },
    });
    const json = await res.json();
    console.log('[purchases] raw response:', json);
    if (json.ok && Array.isArray(json.data)) {
      // Asignamos directamente la data, garantizando que tickets sea un array
      purchases.value = json.data.map((p: any) => ({
        ...p,
        tickets: p.tickets ?? [],
      }));
      console.log('[purchases] mapped:', purchases.value);
      console.log('[purchases] tickets ejemplo:', purchases.value[0]?.tickets);
    } else {
      console.warn('[purchases] respuesta inesperada:', json);
    }
  } catch (e) {
    console.error('Error fetching purchases:', e);
  } finally {
    loading.value = false;
  }
});

function closeDropdown() {
  dropdownOpen.value = false;
}

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar';
  try {
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return map[status] ?? status;
}

async function handleLogout() {
  closeDropdown();
  await logout();
  await navigateTo('/login');
}

type ClickOutsideEl = HTMLElement & { _clickOutside?: (e: MouseEvent) => void };

const vClickOutside = {
  mounted(el: ClickOutsideEl, binding: any) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value();
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el: ClickOutsideEl) {
    if (el._clickOutside)
      document.removeEventListener('click', el._clickOutside);
  },
};
</script>

<style src="./static/styles/styles.css" scoped></style>
