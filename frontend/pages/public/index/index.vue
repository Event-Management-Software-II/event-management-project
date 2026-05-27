<template src="./static/structure/structure.html"></template>

<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useCategories } from '~/composables/useCategories';
import SearchBar from '~/components/public/SearchBar.vue';
import Filters from '~/components/public/Filters.vue';
import EventCard from '~/components/public/EventCard.vue';

const { visibleEvents, loading, fetchEvents } = useEvents();
const { sortedActiveCategories, fetchCategories } = useCategories();
const { user, logout } = useAuth();
const isGuest = computed(() => !user.value);
const dropdownOpen = ref(false);
function closeDropdown() {
  dropdownOpen.value = false;
}
async function handleLogout() {
  closeDropdown();
  await logout();
  await navigateTo('/login');
}
interface ClickOutsideElement extends HTMLElement {
  _clickOutside?: (e: MouseEvent) => void;
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value();
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutside)
      document.removeEventListener('click', el._clickOutside);
  },
};

onMounted(async () => {
  await Promise.all([fetchEvents(), fetchCategories('asc')]);
});

const query = ref('');
const selectedCategory = ref<number | ''>('');
const activeFilters = ref({ free: false, presencial: false, online: false });

const filtered = computed(() =>
  visibleEvents.value.filter((e) => {
    const matchQuery =
      !query.value ||
      e.eventName.toLowerCase().includes(query.value.toLowerCase()) ||
      e.location.toLowerCase().includes(query.value.toLowerCase());
    const matchCategory =
      !selectedCategory.value || e.id_category === selectedCategory.value;
    const matchFree =
      !activeFilters.value.free || !e.ticketTypes || e.ticketTypes.length === 0;
    return matchQuery && matchCategory && matchFree;
  })
);
</script>

<style src="./static/styles/styles.css"></style>