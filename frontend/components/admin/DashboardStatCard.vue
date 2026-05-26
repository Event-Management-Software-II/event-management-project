<template>
  <div class="stat-card">
    <div class="stat-card__header">
      <span class="stat-card__label">{{ label }}</span>
      <span
        v-if="icon"
        class="stat-card__icon"
        :style="{ background: iconBg }"
      >
        <!-- Slot para pasar SVG personalizado -->
        <slot name="icon" />
      </span>
    </div>

    <div class="stat-card__value">
      <slot name="value">
        <span>{{ value }}</span>
      </slot>
    </div>

    <div
      v-if="$slots.detail"
      class="stat-card__detail"
    >
      <slot name="detail" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | number;
  icon?: boolean;
  iconBg?: string;
}>();
</script>

<style scoped>
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 140px;
}

.stat-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.stat-card__label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.055em;
  color: var(--text-muted);
}

.stat-card__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-card__detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}
</style>
