<script setup lang="ts">
defineProps({
  type: {
    type: String,
    default: 'error', // defaults to error since that's what we use most
    validator: (value: string) => ['error', 'success', 'warning', 'info'].includes(value)
  }
})
</script>

<template>
  <div :class="['alert-box', type]">
    <slot></slot>
  </div>
</template>

<style scoped>
.alert-box {
  margin-top: 1.25rem;
  padding: 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.alert-box.error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--status-error);
}

.alert-box.success {
  color: #86efac;
  background: rgba(34, 197, 94, 0.1);
  border-color: var(--status-success);
}

.alert-box.warning {
  color: #fcd34d;
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--status-warning);
}

.alert-box.info {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--pg-blue);
}
</style>
