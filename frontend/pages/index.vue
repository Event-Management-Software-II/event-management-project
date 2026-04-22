<template>
  <div></div>
</template>

<script setup lang="ts">
const { role } = useAuth();

if (role.value === 'admin') await navigateTo('/admin/events');
else if (role.value === 'external') await navigateTo('/public');
else await navigateTo('/public');
</script>
