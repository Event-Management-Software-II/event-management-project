<template>
  <button
    :class="[
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      { 'btn--loading': loading },
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-dasharray="56"
          stroke-dashoffset="14"
          stroke-linecap="round"
        />
      </svg>
    </span>
    <span v-else-if="$slots.icon" class="btn-icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <span v-if="!iconOnly" class="btn-label">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
    label?: string;
    loading?: boolean;
    disabled?: boolean;
    iconOnly?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    iconOnly: false,
    type: 'button',
  }
);
defineEmits<{ click: [e: MouseEvent] }>();
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition),
    color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
  white-space: nowrap;
  outline: none;
}
.btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.btn:active:not(:disabled) {
  transform: scale(0.975);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--sm {
  padding: 6px 12px;
  font-size: 0.72rem;
}
.btn--md {
  padding: 8px 16px;
}

.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  box-shadow: 0 2px 8px rgba(52, 101, 109, 0.25);
}

.btn--secondary {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-color: var(--border-strong);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--primary-light);
}

.btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.btn--ghost:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--primary);
}

.btn--danger {
  background: transparent;
  color: var(--danger);
  border-color: var(--danger-border);
}
.btn--danger:hover:not(:disabled) {
  background: var(--danger-pale);
}

.btn--loading {
  cursor: wait;
}
.btn-spinner svg {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.btn-icon {
  display: grid;
  place-items: center;
}
.btn-label {
  line-height: 1;
}
</style>
