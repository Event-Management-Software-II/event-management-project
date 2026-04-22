<template>
  <div class="success-wrap">
    <div class="success-header">
      <div class="success-icon">🎉</div>
      <h3>¡Boletas listas!</h3>
      <p>
        Guarda o imprime tus boletas. Recuerda que
        <strong>no se pueden cancelar</strong>.
      </p>
    </div>

    <!-- Boletas con QR -->
    <div class="tickets-list" id="print-tickets-area">
      <div v-for="t in tickets" :key="t.id" class="ticket-card">
        <div class="ticket-header">
          <div class="ticket-header-left">
            <span class="ticket-event-name">{{ t.eventName }}</span>
            <span class="ticket-type-chip">{{ t.type }}</span>
          </div>
          <button
            class="ticket-print-single"
            @click="printSingle(t)"
            title="Imprimir esta boleta"
          >
            🖨️
          </button>
        </div>
        <div class="ticket-body">
          <div class="ticket-details">
            <span>📅 {{ formatDate(t.eventDate) }}</span>
            <span>📍 {{ t.eventLocation }}</span>
            <span>👤 {{ t.holderName }}</span>
            <span
              >💰
              {{
                t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString('es-CO')}`
              }}</span
            >
          </div>
          <div class="ticket-qr">
            <QrCode :value="t.qrCode" :size="72" />
            <span class="qr-code-text">{{ t.qrCode }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="success-actions">
      <button class="btn-print" @click="printAll">
        🖨️ Imprimir todas ({{ tickets.length }})
      </button>
      <NuxtLink to="/public/purchases" class="btn-secondary"
        >Ver historial de boletas</NuxtLink
      >
      <button class="btn-buy-more" @click="$emit('buy-more')">
        + Comprar más boletas
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, ref, nextTick } from 'vue';
import type { Ticket } from '~/composables/useTickets';

defineProps<{ tickets: Ticket[] }>();
defineEmits(['close', 'buy-more']);

// ── QR Code component (SVG generado, sin dependencias externas) ───────────────
const QrCode = defineComponent({
  props: {
    value: { type: String, required: true },
    size: { type: Number, default: 72 },
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
      const rects = [];
      for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
          const seed = hash ^ (row * 2654435761) ^ (col * 1013904223);
          if ((seed >>> 0) % 3 === 0) {
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
      }
      // Esquinas fijas (patrón QR estándar)
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

// ── Impresión ─────────────────────────────────────────────────────────────────
const printSingleTicket = ref<Ticket | null>(null);

function printAll() {
  printSingleTicket.value = null;
  nextTick(() => window.print());
}
function printSingle(t: Ticket) {
  printSingleTicket.value = t;
  nextTick(() => window.print());
}

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar';
  try {
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}
</script>

<style scoped>
.success-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.success-header {
  text-align: center;
}
.success-icon {
  font-size: 2.2rem;
  margin-bottom: 8px;
}
.success-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a2332;
  margin-bottom: 6px;
}
.success-header p {
  font-size: 0.82rem;
  color: #4a5568;
  line-height: 1.5;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.ticket-card {
  border: 1.5px solid #e4e7ec;
  border-radius: 12px;
  overflow: hidden;
}
.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #34656d;
}
.ticket-header-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ticket-event-name {
  font-size: 0.84rem;
  font-weight: 800;
  color: #fff;
}
.ticket-type-chip {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.68rem;
  font-weight: 700;
  align-self: flex-start;
}
.ticket-print-single {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  color: #fff;
  cursor: pointer;
  font-size: 0.82rem;
  transition: background 0.15s;
}
.ticket-print-single:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ticket-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  gap: 12px;
}
.ticket-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.78rem;
  color: #4a5568;
  flex: 1;
}
.ticket-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.qr-code-text {
  font-size: 0.56rem;
  color: #8a9bb0;
  font-family: monospace;
  letter-spacing: 0.02em;
  text-align: center;
  max-width: 76px;
  word-break: break-all;
}

/* Acciones */
.success-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn-print {
  padding: 11px;
  background: #1a2332;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-print:hover {
  background: #2d3748;
}
.btn-secondary {
  display: block;
  padding: 10px;
  background: #fff;
  color: #34656d;
  border: 1px solid #d1e8ea;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #e8f4f5;
}
.btn-buy-more {
  padding: 10px;
  background: none;
  border: 1.5px dashed #c8e6ea;
  color: #34656d;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn-buy-more:hover {
  background: #e8f4f5;
  border-color: #34656d;
}

/* Print */
@media print {
  .success-actions,
  .ticket-print-single {
    display: none !important;
  }
  .tickets-list {
    max-height: none;
    overflow: visible;
  }
  .ticket-card {
    break-inside: avoid;
    margin-bottom: 20px;
    border: 2px solid #1a2332;
  }
}
</style>
