<template>
  <div class="image-upload">
    <label class="image-upload__label">
      Imagen del evento
      <span class="image-upload__hint">(JPG, PNG o WebP · máx. 5 MB)</span>
    </label>

    <!-- Preview cuando ya hay una imagen (existente o recién subida) -->
    <div
      v-if="previewUrl"
      class="image-upload__preview-wrap"
    >
      <img
        :src="previewUrl"
        alt="Preview del evento"
        class="image-upload__preview"
      >
      <button
        type="button"
        class="image-upload__remove"
        title="Quitar imagen"
        @click="removeImage"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Zona de drop / selección cuando no hay imagen -->
    <label
      v-else
      class="image-upload__dropzone"
      :class="{
        'image-upload__dropzone--drag': isDragging,
        'image-upload__dropzone--error': !!error,
      }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="image-upload__file-input"
        @change="onFileChange"
      >

      <template v-if="!uploading">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          class="image-upload__icon"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="3"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <circle
            cx="8.5"
            cy="8.5"
            r="1.5"
            fill="currentColor"
          />
          <path
            d="M21 15l-5-5L5 21"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <span class="image-upload__cta">
          Arrastra una imagen o
          <span class="image-upload__link">selecciona un archivo</span>
        </span>
      </template>

      <!-- Spinner mientras sube -->
      <template v-else>
        <svg
          class="image-upload__spinner"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="2"
            stroke-dasharray="40 20"
          />
        </svg>
        <span class="image-upload__cta">Subiendo imagen…</span>
      </template>
    </label>

    <p
      v-if="error"
      class="image-upload__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// ── Props & emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  /** URL actual de la imagen (puede ser null si no hay ninguna) */
  modelValue: string | null;
  /** URL base de la API para construir el endpoint de subida */
  apiUrl: string;
  /** Headers de autorización (Bearer token) */
  authHeaders: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

// ── Estado interno ────────────────────────────────────────────────────────────
const isDragging = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// La preview muestra la URL del modelo (imagen ya subida o URL existente)
const previewUrl = computed(() => props.modelValue || null);

// ── Handlers ──────────────────────────────────────────────────────────────────
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) uploadFile(file);
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) uploadFile(file);
}

function removeImage() {
  emit('update:modelValue', null);
  error.value = null;
  // Resetea el input para permitir volver a seleccionar el mismo archivo
  if (fileInputRef.value) fileInputRef.value.value = '';
}

async function uploadFile(file: File) {
  error.value = null;

  // Validación de tipo en cliente (la real está en el backend)
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    error.value = 'Tipo no permitido. Usa JPG, PNG o WebP.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'El archivo supera el límite de 5 MB.';
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${props.apiUrl}/api/upload/event-image`, {
      method: 'POST',
      headers: props.authHeaders,
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      error.value = data.error ?? 'Error al subir la imagen.';
      return;
    }

    emit('update:modelValue', data.url);
  } catch {
    error.value = 'Error de conexión al subir la imagen.';
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.image-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-upload__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.image-upload__hint {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text-muted);
}

/* ── Dropzone ── */
.image-upload__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-md);
  padding: 28px 16px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition:
    border-color 0.18s,
    background 0.18s;
  text-align: center;
}

.image-upload__dropzone:hover {
  border-color: var(--primary);
  background: var(--primary-pale);
}

.image-upload__dropzone--drag {
  border-color: var(--primary);
  background: var(--primary-pale);
}

.image-upload__dropzone--error {
  border-color: var(--danger);
}

/* Input file oculto — el label actúa como trigger */
.image-upload__file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.image-upload__icon {
  color: var(--text-muted);
}

.image-upload__cta {
  font-size: 0.82rem;
  color: var(--text-muted);
  pointer-events: none;
}

.image-upload__link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: underline;
}

/* ── Spinner ── */
.image-upload__spinner {
  color: var(--primary);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Preview ── */
.image-upload__preview-wrap {
  position: relative;
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}

.image-upload__preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.image-upload__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.image-upload__remove:hover {
  background: var(--danger);
}

/* ── Error ── */
.image-upload__error {
  font-size: 0.76rem;
  color: var(--danger);
  margin: 0;
}
</style>
