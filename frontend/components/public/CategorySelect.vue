<template>
  <div class="category-select">
    <select v-model="selected" @change="onChange">
      <option value="">Todas las categorías</option>
      <option
        v-for="c in categories"
        :key="typeof c === 'object' ? c.id_category : c"
        :value="typeof c === 'object' ? c.id_category : c"
      >
        {{ typeof c === 'object' ? c.nameCategory : c }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ categories: any[] }>()
const emit  = defineEmits(['update:category'])

const selected = ref<any>('')

function onChange() { emit('update:category', selected.value) }
</script>