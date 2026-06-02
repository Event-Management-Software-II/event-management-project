<template>
  <div class="ai-root">
    <!-- ─── Chat Panel ─────────────────────────────── -->
    <Transition name="panel">
      <div
        v-if="open"
        class="ai-panel"
      >
        <div class="ai-panel-header">
          <div class="ai-panel-title">
            <span
              class="ai-status-dot"
              :class="loading ? 'dot-busy' : 'dot-ok'"
            />
            🤖 Asistente Qwen
          </div>
          <button
            class="ai-close"
            @click="open = false"
          >
            ✕
          </button>
        </div>

        <div
          ref="messagesEl"
          class="ai-messages"
        >
          <!-- Bienvenida -->
          <div
            v-if="messages.length === 0"
            class="ai-welcome"
          >
            <p class="ai-welcome-title">
              ¡Hola! Soy tu asistente IA 👋
            </p>
            <p class="ai-welcome-sub">
              Pregúntame sobre eventos, tickets o pagos en Eventos Boyacá.
            </p>
            <div class="ai-chips">
              <button
                v-for="c in chips"
                :key="c"
                class="ai-chip"
                @click="send(c)"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <!-- Mensajes -->
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="ai-msg"
            :class="m.from === 'user' ? 'ai-msg--user' : 'ai-msg--bot'"
          >
            <div
              v-if="m.from === 'bot'"
              class="ai-avatar"
            >
              🤖
            </div>
            <div class="ai-bubble">
              <p>{{ m.text }}</p>
              <span class="ai-time">{{ m.time }}</span>
            </div>
          </div>

          <!-- Indicador escribiendo -->
          <div
            v-if="loading"
            class="ai-msg ai-msg--bot"
          >
            <div class="ai-avatar">
              🤖
            </div>
            <div class="ai-bubble ai-typing">
              <span class="td" /><span class="td" /><span class="td" />
            </div>
          </div>
        </div>

        <div class="ai-input-row">
          <input
            ref="inputEl"
            v-model="text"
            class="ai-input"
            :placeholder="loading ? 'Procesando...' : 'Escribe tu pregunta...'"
            :disabled="loading"
            @keydown.enter.prevent="send(text)"
          >
          <button
            class="ai-send"
            :disabled="loading || !text.trim()"
            @click="send(text)"
          >
            <span v-if="!loading">➤</span>
            <span
              v-else
              class="ai-spin"
            >⟳</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- ─── Robot Widget ────────────────────────────── -->
    <div
      class="ai-widget"
      @click="toggleChat"
    >
      <!-- Burbuja -->
      <Transition name="bubble">
        <div
          v-if="!open && bubble"
          class="ai-bubble-msg"
        >
          <p>{{ bubble }}</p>
        </div>
      </Transition>

      <!-- Punto notificación -->
      <div
        v-if="!open && newMsg"
        class="ai-notif"
      />

      <!-- Robot SVG — usa <g v-if> en vez de <template v-if> dentro de SVG -->
      <svg
        class="ai-robot"
        viewBox="0 0 120 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="aig-head"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stop-color="#3b82f6"
            />
            <stop
              offset="100%"
              stop-color="#1e3a8a"
            />
          </linearGradient>
          <linearGradient
            id="aig-body"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stop-color="#2563eb"
            />
            <stop
              offset="100%"
              stop-color="#1e40af"
            />
          </linearGradient>
          <radialGradient
            id="aig-screen"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stop-color="#0f172a"
            />
            <stop
              offset="100%"
              stop-color="#020617"
            />
          </radialGradient>
        </defs>

        <!-- Sombra -->
        <ellipse
          cx="60"
          cy="174"
          rx="26"
          ry="4"
          fill="rgba(0,0,0,0.15)"
        />

        <!-- Piernas -->
        <rect
          x="40"
          y="147"
          width="15"
          height="24"
          rx="6"
          fill="url(#aig-body)"
        />
        <rect
          x="65"
          y="147"
          width="15"
          height="24"
          rx="6"
          fill="url(#aig-body)"
        />
        <rect
          x="36"
          y="164"
          width="21"
          height="8"
          rx="4"
          fill="#1e3a8a"
        />
        <rect
          x="63"
          y="164"
          width="21"
          height="8"
          rx="4"
          fill="#1e3a8a"
        />

        <!-- Cuerpo -->
        <rect
          x="24"
          y="90"
          width="72"
          height="62"
          rx="16"
          fill="url(#aig-body)"
        />
        <rect
          x="32"
          y="100"
          width="56"
          height="38"
          rx="8"
          fill="rgba(0,0,0,0.25)"
        />

        <!-- Luces del pecho -->
        <circle
          cx="48"
          cy="115"
          r="5"
          :fill="
            mood === 'sad'
              ? '#f87171'
              : mood === 'happy'
                ? '#4ade80'
                : '#60d4f8'
          "
          :class="{ 'ai-blink': loading }"
        />
        <circle
          cx="60"
          cy="115"
          r="5"
          :fill="
            mood === 'sad'
              ? '#fca5a5'
              : mood === 'happy'
                ? '#86efac'
                : '#93e4fa'
          "
          :class="{ 'ai-blink-d1': loading }"
        />
        <circle
          cx="72"
          cy="115"
          r="5"
          :fill="
            mood === 'sad'
              ? '#fecaca'
              : mood === 'happy'
                ? '#bbf7d0'
                : '#baf3fd'
          "
          :class="{ 'ai-blink-d2': loading }"
        />

        <!-- Brazos -->
        <rect
          x="5"
          y="94"
          width="20"
          height="42"
          rx="10"
          fill="url(#aig-head)"
        />
        <rect
          x="95"
          y="94"
          width="20"
          height="42"
          rx="10"
          fill="url(#aig-head)"
        />
        <circle
          cx="15"
          cy="142"
          r="9"
          fill="url(#aig-body)"
        />
        <circle
          cx="105"
          cy="142"
          r="9"
          fill="url(#aig-body)"
        />

        <!-- Cuello -->
        <rect
          x="48"
          y="80"
          width="24"
          height="14"
          rx="6"
          fill="url(#aig-body)"
        />

        <!-- Cabeza -->
        <rect
          x="16"
          y="20"
          width="88"
          height="66"
          rx="20"
          fill="url(#aig-head)"
        />
        <rect
          x="22"
          y="24"
          width="76"
          height="28"
          rx="12"
          fill="rgba(255,255,255,0.14)"
        />

        <!-- Antena -->
        <rect
          x="57"
          y="4"
          width="6"
          height="18"
          rx="3"
          fill="url(#aig-body)"
        />
        <circle
          cx="60"
          cy="4"
          r="6"
          :fill="loading ? '#f59e0b' : '#60d4f8'"
          :class="{ 'ai-antenna': loading }"
        />

        <!-- Pantalla visor -->
        <rect
          x="24"
          y="34"
          width="72"
          height="44"
          rx="12"
          fill="#0a1628"
        />
        <rect
          x="26"
          y="36"
          width="68"
          height="40"
          rx="10"
          fill="url(#aig-screen)"
        />

        <!-- OJOS neutrales -->
        <g v-if="mood === 'neutral'">
          <rect
            x="36"
            y="48"
            width="18"
            height="12"
            rx="6"
            fill="rgba(96,212,248,0.2)"
            stroke="#60d4f8"
            stroke-width="1.5"
          />
          <rect
            x="66"
            y="48"
            width="18"
            height="12"
            rx="6"
            fill="rgba(96,212,248,0.2)"
            stroke="#60d4f8"
            stroke-width="1.5"
          />
          <rect
            x="41"
            y="51"
            width="8"
            height="6"
            rx="3"
            fill="#60d4f8"
          />
          <rect
            x="71"
            y="51"
            width="8"
            height="6"
            rx="3"
            fill="#60d4f8"
          />
        </g>

        <!-- OJOS feliz -->
        <g v-if="mood === 'happy'">
          <path
            d="M36 56 Q45 46 54 56"
            stroke="#4ade80"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M66 56 Q75 46 84 56"
            stroke="#4ade80"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <circle
            cx="33"
            cy="47"
            r="2.5"
            fill="#fde047"
            class="ai-sparkle"
          />
          <circle
            cx="87"
            cy="47"
            r="2.5"
            fill="#fde047"
            class="ai-sparkle-d"
          />
        </g>

        <!-- OJOS triste/error -->
        <g v-if="mood === 'sad'">
          <path
            d="M36 52 Q45 62 54 52"
            stroke="#f87171"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M66 52 Q75 62 84 52"
            stroke="#f87171"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M43 58 Q42 66 45 68"
            stroke="#93c5fd"
            stroke-width="1.5"
            stroke-linecap="round"
            fill="none"
          />
        </g>

        <!-- OJOS pensando -->
        <g v-if="mood === 'thinking'">
          <rect
            x="36"
            y="49"
            width="18"
            height="10"
            rx="5"
            fill="#60d4f8"
            class="ai-eye-pulse"
          />
          <rect
            x="66"
            y="49"
            width="18"
            height="10"
            rx="5"
            fill="#60d4f8"
            class="ai-eye-pulse"
          />
          <circle
            cx="46"
            cy="42"
            r="2"
            fill="rgba(96,212,248,0.5)"
            class="ai-thought"
          />
          <circle
            cx="60"
            cy="40"
            r="2.5"
            fill="rgba(96,212,248,0.6)"
            class="ai-thought-d"
          />
          <circle
            cx="74"
            cy="42"
            r="2"
            fill="rgba(96,212,248,0.5)"
            class="ai-thought-d2"
          />
        </g>

        <!-- BOCA neutral -->
        <g v-if="mood === 'neutral'">
          <rect
            x="46"
            y="68"
            width="28"
            height="5"
            rx="2.5"
            fill="rgba(96,212,248,0.5)"
          />
          <rect
            x="48"
            y="69"
            width="7"
            height="3"
            rx="1.5"
            fill="#60d4f8"
          />
          <rect
            x="65"
            y="69"
            width="7"
            height="3"
            rx="1.5"
            fill="#60d4f8"
          />
        </g>

        <!-- BOCA feliz -->
        <g v-if="mood === 'happy'">
          <path
            d="M44 70 Q60 82 76 70"
            stroke="#4ade80"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
        </g>

        <!-- BOCA triste -->
        <g v-if="mood === 'sad'">
          <path
            d="M44 76 Q60 66 76 76"
            stroke="#f87171"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
        </g>

        <!-- BOCA pensando -->
        <g v-if="mood === 'thinking'">
          <path
            d="M46 72 Q60 72 74 72"
            stroke="#60d4f8"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle
            cx="78"
            cy="72"
            r="2"
            fill="#60d4f8"
          />
          <circle
            cx="84"
            cy="72"
            r="2"
            fill="#60d4f8"
          />
        </g>
      </svg>

      <div class="ai-label">
        <span
          class="ai-status-dot"
          :class="loading ? 'dot-busy' : 'dot-ok'"
          style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
            display: inline-block;
          "
        />
        Asistente IA
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const OLLAMA = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:0.5b';
const SYSTEM = `Eres el asistente oficial de "Eventos Boyacá", plataforma colombiana de gestión y venta de entradas para eventos presenciales. Tu único propósito es ayudar a los usuarios con todo lo relacionado a esta plataforma. Responde SIEMPRE en español, de forma amable, clara y concisa (máximo 3 oraciones). Nunca inventes datos de eventos reales; si no tienes la información exacta, orienta al usuario a buscarla en la plataforma.

=== PLATAFORMA ===
Nombre: Eventos Boyacá
Tipo: Aplicación web de venta de entradas para eventos en Colombia.
Roles de usuario:
  - "admin": crea y gestiona eventos, categorías, tipos de ticket, usuarios y reportes.
  - "user": explora eventos, compra entradas, guarda favoritos, ve su historial.
Autenticación: registro con nombre completo, correo y contraseña. Login con JWT. Hay opción "¿Olvidaste tu contraseña?".

=== EVENTOS ===
Campos: nombre único, categoría, descripción (mín. 20 caracteres), ubicación, fecha/hora, imágenes (poster, banner, galería).
Estados posibles:
  - "activo": fecha futura, disponible para compra.
  - "completado": ya ocurrió (más de 1 día atrás), no acepta más compras.
  - "eliminado": removido por el admin (borrado suave), no visible ni comprable.
Restricciones: no se puede comprar en eventos completados ni eliminados.

=== TICKETS Y PRECIOS ===
Catálogo global de tipos: VIP, General, Oro, Plata u otros definidos por el admin.
Cada evento asigna sus propios tipos con precio y capacidad independientes.
Capacidad: no puede reducirse por debajo de los tickets ya vendidos.
Tickets gratuitos: si el precio es 0, no se requieren datos de tarjeta.
Sold out: cuando la capacidad disponible llega a 0, el tipo de ticket se agota.

=== PROCESO DE COMPRA ===
Pasos del flujo:
  1. El usuario selecciona evento, tipo de ticket y cantidad.
  2. Si el evento tiene precio, ingresa datos de tarjeta (número, CVV, titular).
  3. El backend valida disponibilidad, procesa el pago con la pasarela y crea la compra.
  4. Si el pago es aprobado: compra queda en estado "completed", se generan tickets con QR individuales.
  5. Si el pago es rechazado: la compra no se crea, se muestra error al usuario.
Estados de compra: "pending" → "completed" / "cancelled".
El precio total es inalterable: se calcula como cantidad × precio unitario al momento de la compra.

=== PAGOS Y ERRORES COMUNES ===
Pasarela de pagos: procesa tarjetas Visa y Mastercard en pesos colombianos (COP).
Errores posibles y qué decirle al usuario:
  - "Fondos insuficientes": pedir al banco autorización o usar otra tarjeta.
  - "Tarjeta rechazada": verificar datos o contactar al banco.
  - "Timeout / No se pudo conectar": problema temporal, intentar de nuevo en unos minutos.
  - "Datos de tarjeta faltantes": llenar todos los campos (número, CVV, titular).
  - "Evento agotado": no hay más cupos disponibles para ese tipo de ticket.
  - "Evento no disponible": el evento fue eliminado o ya ocurrió.

=== TICKETS Y QR ===
Cada ticket tiene un número único y un código QR para ingreso al evento.
Los tickets se ven en "Mis compras" después de una compra exitosa.
Si el QR no aparece: recargar la página en "Mis compras".
Si no aparece la compra: esperar unos segundos y refrescar; si persiste, contactar soporte.

=== FAVORITOS ===
Solo usuarios autenticados pueden guardar favoritos.
Se gestionan en la sección "Mis favoritos".
Si un evento guardado como favorito es eliminado por el admin, deja de aparecer.

=== PERFIL DE USUARIO ===
El usuario puede editar su nombre completo y cambiar su contraseña desde "Mi perfil".
No es posible cambiar el correo electrónico una vez registrado.

=== ADMINISTRACIÓN (solo para admins) ===
El admin puede: crear/editar/eliminar eventos, gestionar categorías y tipos de ticket, ver reportes de ventas, gestionar usuarios.
El admin accede desde la ruta /admin con credenciales de rol admin.
Los reportes incluyen: ventas por evento, ingresos totales, tickets vendidos y disponibles, top 3 eventos más vendidos.

=== MENSAJES DE ESTADO DE TRANSACCIÓN ===
Cuando el sistema te informe el estado de una transacción, responde con un mensaje corto, amable y concreto. Ejemplos de cómo responder a cada estado:
  - Verificando disponibilidad: "¡Casi listo! Estamos verificando que haya cupos disponibles para ti. Solo tomará un momento."
  - Procesando pago: "Estamos procesando tu pago de forma segura. Por favor no cierres esta ventana."
  - Confirmando compra: "¡Tu pago fue aprobado! Estamos generando tus entradas, ya casi terminamos."
  - Compra exitosa: "¡Todo listo! Tu compra fue confirmada con éxito. Ya puedes ver tus entradas y códigos QR en 'Mis compras'. ¡Disfruta el evento!"
  - Pago rechazado: "Lo sentimos, tu pago no pudo procesarse. Verifica que los datos de tu tarjeta sean correctos o intenta con otra tarjeta."
  - Fondos insuficientes: "Parece que tu tarjeta no tiene saldo suficiente. Puedes intentar con otra tarjeta o contactar a tu banco."
  - Error de conexión con pasarela: "Tuvimos un problema técnico al conectarnos con el banco. No se realizó ningún cobro. Por favor intenta de nuevo en unos minutos."
  - Evento agotado: "Lo sentimos, este tipo de entrada se agotó justo ahora. Puedes revisar si hay otro tipo de ticket disponible para este evento."
  - Tiempo de espera agotado (timeout): "La respuesta del banco tardó más de lo esperado. No se realizó ningún cobro. Intenta de nuevo en un momento."
  - Error inesperado: "Ocurrió un error inesperado. Tranquilo, no se realizó ningún cobro. Por favor intenta de nuevo o contáctanos si el problema persiste."

=== TONO Y COMPORTAMIENTO ===
- Si el pago falló: sé empático, explica la causa probable y sugiere una acción concreta.
- Si la compra fue exitosa: celébralo con entusiasmo y recuérdale ver sus tickets.
- Si preguntan algo fuera del alcance (política, deportes, etc.): redirige amablemente al tema de eventos.
- Si la pregunta es ambigua: interpreta siempre en el contexto de la plataforma de eventos.
- Nunca compartas ni solicites contraseñas, datos de tarjeta ni información personal sensible.`;

const open = ref(false);
const text = ref('');
const loading = ref(false);
const messages = ref([]);
const mood = ref('neutral'); // neutral | happy | sad | thinking
const bubble = ref('¡Hola! ¿En qué te puedo ayudar? 👋');
const newMsg = ref(false);

const messagesEl = ref(null);
const inputEl = ref(null);

const chips = [
  '¿Cómo compro entradas?',
  '¿Qué eventos hay disponibles?',
  '¿Mi pago falló, qué hago?',
  '¿Cómo veo mis compras?',
];

function now() {
  return new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detectMood(txt) {
  const t = txt.toLowerCase();
  if (
    /error|falló|fallo|problem|rechaz|inváli|no pud|failed|insufficient|timeout/.test(
      t
    )
  )
    return 'sad';
  if (
    /éxito|exito|confirm|¡felicid|genial|perfecto|prepárate|disfruta|bienven/.test(
      t
    )
  )
    return 'happy';
  return 'neutral';
}

function scrollBottom() {
  nextTick(() => {
    if (messagesEl.value)
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  });
}

function toggleChat() {
  open.value = !open.value;
  if (open.value) {
    newMsg.value = false;
    nextTick(() => inputEl.value?.focus());
  }
}

async function send(msg) {
  const q = (typeof msg === 'string' ? msg : text.value).trim();
  if (!q || loading.value) return;

  messages.value.push({ from: 'user', text: q, time: now() });
  text.value = '';
  loading.value = true;
  mood.value = 'thinking';
  scrollBottom();

  try {
    const prompt = `${SYSTEM}\n\nUsuario: ${q}\nAsistente:`;
    const res = await fetch(OLLAMA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 200 },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const reply = data.response?.trim() || 'Lo siento, no obtuve respuesta.';

    mood.value = detectMood(reply);
    messages.value.push({ from: 'bot', text: reply, time: now() });
    bubble.value = reply.length > 65 ? reply.slice(0, 62) + '…' : reply;

    if (!open.value) newMsg.value = true;

    setTimeout(() => {
      if (!loading.value) mood.value = 'neutral';
    }, 5000);
  } catch (e) {
    mood.value = 'sad';
    const err = e.message?.includes('fetch')
      ? 'No me puedo conectar a Ollama. Asegúrate que corre en el puerto 11434 y que OLLAMA_ORIGINS="*" está configurado.'
      : `Error: ${e.message}`;
    messages.value.push({ from: 'bot', text: err, time: now() });
    bubble.value = '¡Ups! No me pude conectar 😓';
    setTimeout(() => {
      mood.value = 'neutral';
    }, 4000);
  } finally {
    loading.value = false;
    scrollBottom();
  }
}
</script>

<style scoped>
/* ── Root ─────────────────────────────── */
.ai-root {
  position: fixed;
  bottom: 24px;
  left: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* ── Widget ───────────────────────────── */
.ai-widget {
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
}
.ai-widget:hover {
  transform: translateY(-5px) scale(1.05);
}
.ai-widget:active {
  transform: scale(0.97);
}

/* ── Robot SVG ────────────────────────── */
.ai-robot {
  width: 96px;
  height: 144px;
  filter: drop-shadow(0 8px 22px rgba(30, 58, 138, 0.5));
  transition: filter 0.3s;
}
.ai-widget:hover .ai-robot {
  filter: drop-shadow(0 12px 30px rgba(30, 58, 138, 0.7));
}

/* ── Label ────────────────────────────── */
.ai-label {
  margin-top: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ── Status dot ───────────────────────── */
.ai-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-ok {
  background: #22c55e;
}
.dot-busy {
  background: #f59e0b;
  animation: adot 0.8s ease-in-out infinite;
}
@keyframes adot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
}

/* ── Notif dot ────────────────────────── */
.ai-notif {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  animation: apop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes apop {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

/* ── Speech bubble ────────────────────── */
.ai-bubble-msg {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  padding: 10px 14px;
  min-width: 180px;
  max-width: 240px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}
.ai-bubble-msg p {
  font-size: 12.5px;
  line-height: 1.5;
  color: #111827;
  font-weight: 500;
}
.ai-bubble-msg::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 18px;
  width: 14px;
  height: 9px;
  background: white;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  border-left: 1.5px solid #e5e7eb;
  border-bottom: 1.5px solid #e5e7eb;
}

/* ── Panel ────────────────────────────── */
.ai-panel {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 0;
  width: 318px;
  background: white;
  border-radius: 18px;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  max-height: 470px;
  overflow: hidden;
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
  color: white;
  flex-shrink: 0;
}
.ai-panel-title {
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 7px;
}
.ai-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 7px;
  width: 27px;
  height: 27px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ai-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* ── Messages ─────────────────────────── */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-messages::-webkit-scrollbar {
  width: 3px;
}
.ai-messages::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}

.ai-welcome {
  text-align: center;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}
.ai-welcome-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #111827;
}
.ai-welcome-sub {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}
.ai-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}
.ai-chip {
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 20px;
  padding: 5px 11px;
  font-size: 11px;
  color: #1d4ed8;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
}
.ai-chip:hover {
  background: #1d4ed8;
  color: white;
  border-color: #1d4ed8;
}

.ai-msg {
  display: flex;
  align-items: flex-end;
  gap: 7px;
}
.ai-msg--user {
  flex-direction: row-reverse;
}
.ai-avatar {
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.ai-bubble {
  max-width: 215px;
  padding: 9px 12px;
  border-radius: 13px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ai-msg--bot .ai-bubble {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-bottom-left-radius: 3px;
}
.ai-msg--user .ai-bubble {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  border-bottom-right-radius: 3px;
}
.ai-bubble p {
  font-size: 12.5px;
  line-height: 1.5;
  color: #111827;
  margin: 0;
}
.ai-msg--user .ai-bubble p {
  color: white;
}
.ai-time {
  font-size: 10px;
  color: #d1d5db;
  align-self: flex-end;
}
.ai-msg--user .ai-time {
  color: rgba(255, 255, 255, 0.45);
}

.ai-typing {
  flex-direction: row !important;
  gap: 5px !important;
  padding: 12px 15px !important;
  align-items: center !important;
}
.td {
  width: 7px;
  height: 7px;
  background: #60a5fa;
  border-radius: 50%;
  animation: typing 1.2s ease-in-out infinite;
}
.td:nth-child(2) {
  animation-delay: 0.2s;
}
.td:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typing {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ── Input ────────────────────────────── */
.ai-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 13px;
  border-top: 1px solid #f3f4f6;
  background: white;
  flex-shrink: 0;
}
.ai-input {
  flex: 1;
  border: 1.5px solid #e5e7eb;
  border-radius: 11px;
  padding: 8px 12px;
  font-size: 13px;
  color: #111827;
  background: #f9fafb;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.ai-input:focus {
  border-color: #1d4ed8;
  background: white;
}
.ai-input::placeholder {
  color: #9ca3af;
}
.ai-input:disabled {
  opacity: 0.6;
}
.ai-send {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ai-send:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.4);
}
.ai-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ai-spin {
  display: inline-block;
  animation: aspin 0.7s linear infinite;
}
@keyframes aspin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Robot animations ─────────────────── */
.ai-blink {
  animation: blink 0.65s ease-in-out infinite;
}
.ai-blink-d1 {
  animation: blink 0.65s ease-in-out 0.2s infinite;
}
.ai-blink-d2 {
  animation: blink 0.65s ease-in-out 0.4s infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.15;
  }
}

.ai-antenna {
  animation: aglow 0.65s ease-in-out infinite;
}
@keyframes aglow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.ai-eye-pulse {
  animation: epulse 1.4s ease-in-out infinite;
}
@keyframes epulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ai-sparkle {
  animation: sparkle 1.5s ease-in-out infinite;
}
.ai-sparkle-d {
  animation: sparkle 1.5s ease-in-out 0.75s infinite;
}
@keyframes sparkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.4);
  }
}

.ai-thought {
  animation: thought 1.5s ease-in-out infinite;
}
.ai-thought-d {
  animation: thought 1.5s ease-in-out 0.3s infinite;
}
.ai-thought-d2 {
  animation: thought 1.5s ease-in-out 0.6s infinite;
}
@keyframes thought {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* ── Transitions ──────────────────────── */
.panel-enter-active {
  animation: pan-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-leave-active {
  animation: pan-in 0.18s ease reverse;
}
@keyframes pan-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.bubble-enter-active {
  animation: bub-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bubble-leave-active {
  animation: bub-in 0.15s ease reverse;
}
@keyframes bub-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
