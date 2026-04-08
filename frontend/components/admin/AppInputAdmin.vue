<template>
  <div :class="['field', { 'field--error': !!error, 'field--disabled': disabled }]">
    <label v-if="label" :for="fieldId" class="field-label">
      {{ label }}
      <span v-if="required" class="field-required">*</span>
    </label>

    <div class="field-wrap">
      <span v-if="$slots.prefix" class="field-prefix"><slot name="prefix"/></span>

      <component
        :is="as"
        v-bind="inputAttrs"
        :id="fieldId"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :rows="as === 'textarea' ? rows : undefined"
        :class="['field-input', { 'with-prefix': $slots.prefix }]"
        @input="handleInput"
      >
        <template v-if="as === 'select'">
          <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
          <slot/>
        </template>
      </component>
    </div>

    <Transition name="err">
      <p v-if="error" class="field-error" role="alert">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        {{ error }}
      </p>
    </Transition>

    <p v-if="helper && !error" class="field-helper">{{ helper }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let counter = 0

const props = withDefaults(defineProps<{
  modelValue?:  string | number
  label?:       string
  placeholder?: string
  helper?:      string
  error?:       string
  type?:        string
  as?:          'input' | 'textarea' | 'select'
  rows?:        number
  required?:    boolean
  disabled?:    boolean
  maxlength?:   number
  min?:         number | string
  hint?:        string
}>(), {
  type: 'text', as: 'input', rows: 4,
  required: false, disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [v: string | number] }>()

const fieldId = `field-${++counter}`

const inputAttrs = computed(() => {
  const attrs: Record<string, unknown> = {}
  // type solo aplica a <input>, no a <select> ni <textarea>
  if (props.as === 'input') attrs.type = props.type
  if (props.maxlength) attrs.maxlength = props.maxlength
  if (props.min !== undefined) attrs.min = props.min
  if (props.error) { attrs['aria-invalid'] = 'true'; attrs['aria-describedby'] = `${fieldId}-err` }
  return attrs
})

function handleInput(e: Event) {
  const value = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
  emit('update:modelValue', props.type === 'number' ? Number(value) : value)
}
</script>

<style scoped>
.field { display:flex; flex-direction:column; gap:5px; }

.field-label { font-family:var(--font-display); font-size:.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--text-secondary); display:flex; align-items:center; gap:4px; }
.field-required { color:var(--danger); }

.field-wrap { position:relative; display:flex; align-items:stretch; }

.field-input { width:100%; background:var(--bg-surface); border:1px solid var(--border-strong); border-radius:var(--radius-md); color:var(--text-primary); font-family:var(--font-mono); font-size:.875rem; padding:9px 13px; transition:border-color var(--transition), box-shadow var(--transition); outline:none; appearance:none; }
.field-input::placeholder { color:var(--text-muted); }
.field-input:hover:not(:disabled) { border-color:var(--primary-light); }
.field-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(52,101,109,.12); }

.field--error .field-input { border-color:var(--danger); background:var(--danger-pale); }
.field--error .field-input:focus { box-shadow:0 0 0 3px rgba(192,57,43,.1); }
.field--disabled .field-input { opacity:.5; cursor:not-allowed; }

textarea.field-input { resize:vertical; min-height:90px; line-height:1.55; }

select.field-input { cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%239ca3af' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:34px; }

.field-prefix { display:flex; align-items:center; justify-content:center; padding:0 11px; background:var(--bg-elevated); border:1px solid var(--border-strong); border-right:none; border-radius:var(--radius-md) 0 0 var(--radius-md); color:var(--text-muted); font-size:.82rem; }
.field-input.with-prefix { border-radius:0 var(--radius-md) var(--radius-md) 0; }

.field-error { display:flex; align-items:flex-start; gap:5px; font-size:.74rem; font-family:var(--font-mono); color:var(--danger); line-height:1.4; }
.field-error svg { flex-shrink:0; margin-top:1px; }
.field-helper { font-size:.73rem; color:var(--text-muted); }

.err-enter-active { transition:opacity 180ms ease, transform 180ms ease; }
.err-leave-active { transition:opacity 130ms ease; }
.err-enter-from   { opacity:0; transform:translateY(-3px); }
.err-leave-to     { opacity:0; }
</style>