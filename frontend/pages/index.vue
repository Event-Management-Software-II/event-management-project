<template>
  <div></div>
</template>

<script setup lang="ts">
const { role } = useAuth();

if (role.value === 'admin') await navigateTo('/admin/events');
else if (role.value === 'external') await navigateTo('/public/index');
else await navigateTo('/public/index');
</script>
