<template>
  <div class="searchbar searchbar-inline">
    <input
      v-model="query"
      type="search"
      placeholder="🔎 Buscar eventos..."
      @input="onInput"
    />
    <div class="search-actions">
      <CategorySelect :categories="categories" @update:category="onCategory" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CategorySelect from './CategorySelect.vue';
const props = defineProps({ categories: { type: Array, default: () => [] } });
const emit = defineEmits(['update:query', 'update:category']);
const query = ref('');
function onInput() {
  emit('update:query', query.value);
}
function onCategory(value) {
  emit('update:category', value);
}
</script>
