<template src="./static/structure/structure.html"></template>

<script setup lang="ts">
definePageMeta({ layout: false });

const { user, logout } = useAuth();
const dropdownOpen = ref(false);

function closeDropdown() {
  dropdownOpen.value = false;
}

const initials = computed(() => {
  if (!user.value?.name) return '?';
  return user.value.name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

const formattedDate = computed(() => {
  const date = (user.value as any)?.created_at;
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
});

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
</script>

<style src="./static/styles/styles.css" scoped></style>
