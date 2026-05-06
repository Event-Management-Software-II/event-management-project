<template>
  <div />
</template>

<script setup lang="ts">
const { role } = useAuth();

if (role.value === 'admin') await navigateTo('/admin');
else if (role.value === 'external') await navigateTo('/public');
else await navigateTo('/public');
</script>
