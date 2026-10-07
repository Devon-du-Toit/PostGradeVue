<script setup lang="ts">
defineProps<{ name: string }>()
const paths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  courses: 'M4 5h6a3 3 0 0 1 3 3v12a4 4 0 0 0-4-2H4zM13 8a3 3 0 0 1 3-3h5v13h-4a4 4 0 0 0-4 2',
  verify: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M9 12l4 4L22 5',
  arrow: 'M5 12h14M14 7l5 5-5 5',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10',
  logout: 'M9 4H4v16h5M9 12h12M16 7l5 5-5 5',
  upload: 'M12 16V3M7 8l5-5 5 5M4 15v6h16v-6',
  mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
}
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name] || paths.courses" />
  </svg>
</template>
<style scoped>
svg {
  width: 1.2rem;
  height: 1.2rem;
  flex-shrink: 0;
}
</style>
