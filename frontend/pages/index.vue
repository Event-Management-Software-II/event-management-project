<template>
  <div />
</template>

<script setup lang="ts">
const { role } = useAuth();

<<<<<<< Updated upstream
if (role.value === 'admin') await navigateTo('/admin');
=======
if (role.value === 'admin') await navigateTo('/admin/events');
>>>>>>> Stashed changes
else if (role.value === 'external') await navigateTo('/public');
else await navigateTo('/public');
</script>
