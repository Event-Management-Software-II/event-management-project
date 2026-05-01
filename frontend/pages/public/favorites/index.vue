<template src="./static/structure/structure.html"></template>

<script setup lang="ts">
import EventDetailModal from '~/components/public/EventDetailModal.vue';

const config = useRuntimeConfig();
const API = `${config.public.apiUrl}/api`;

definePageMeta({ layout: false });

// Evita SSR para esta página — depende de localStorage para el token
if (import.meta.server) {
  await navigateTo('/login');
}

const { user, logout, authHeaders } = useAuth();
const dropdownOpen = ref(false);

const favoriteEvents = ref<any[]>([]);
const loading = ref(false);

const selectedEvent = ref<any | null>(null);

async function removeFavorite(idEvent: number) {
  try {
    const res = await fetch(`${API}/favorites/${idEvent}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      favoriteEvents.value = favoriteEvents.value.filter(
        (e) => e.id_event !== idEvent
      );
    }
  } catch (e) {
    console.error('Error removing favorite:', e);
  }
}

async function openEvent(idEvent: number) {
  try {
    const res = await fetch(`${API}/events/${idEvent}`);
    const data = await res.json();
    if (data && data.id_event) {
      // Normalizar al mismo shape que usa EventDetailModal
      selectedEvent.value = {
        ...data,
        NameEvent: data.eventName,
        nameCategory: data.category?.categoryName ?? '',
        imageUrl: data.images?.[0]?.image_url ?? null,
      };
    }
  } catch (e) {
    console.error('Error fetching event detail:', e);
  }
}

onMounted(async () => {
  console.log('montado, fetching favorites...');
  loading.value = true;
  try {
    const res = await fetch(`${API}/favorites`, {
      headers: authHeaders(),
    });
    console.log('status:', res.status);
    const json = await res.json();
    console.log('response:', json);
    if (json.ok) {
      // El backend devuelve idEvent, dateTime, favoritedAt — normalizamos al shape que espera EventCard
      favoriteEvents.value = json.data.map((f: any) => ({
        id_event: f.idEvent,
        NameEvent: f.eventName,
        eventName: f.eventName,
        minPrice: f.minPrice,
        location: f.location,
        date_time: f.dateTime,
        nameCategory: f.categoryName,
        imageUrl: f.imageUrl,
        description: '',
      }));
    }
  } catch (e) {
    console.error('Error fetching favorites:', e);
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

