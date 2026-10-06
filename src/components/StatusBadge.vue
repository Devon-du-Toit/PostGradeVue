<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status:
    | 'uploaded'
    | 'processing'
    | 'matched'
    | 'needs_verification'
    | 'recognition_failed'
    | 'verified'
    | string
}>()

const label = computed(() => {
  const labels: Record<string, string> = {
    uploaded: 'Uploaded',
    processing: 'Processing',
    matched: 'Matched',
    needs_verification: 'Needs verification',
    recognition_failed: 'Recognition failed',
    verified: 'Verified',
  }
  return labels[props.status] || 'Unknown'
})
</script>

<template>
  <span class="status-badge" :data-status="status">
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.status-badge[data-status='uploaded'] {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}
.status-badge[data-status='matched'] {
  background: rgba(34, 211, 238, 0.15);
  color: var(--status-match-text);
}
.status-badge[data-status='needs_verification'] {
  background: rgba(245, 158, 11, 0.15);
  color: var(--status-warning);
}
.status-badge[data-status='verified'] {
  background: rgba(168, 85, 247, 0.15);
  color: var(--status-verified-text);
}
.status-badge[data-status='processing'] {
  background: rgba(59, 130, 246, 0.15);
  color: var(--status-info-text);
}
.status-badge[data-status='recognition_failed'] {
  background: rgba(239, 68, 68, 0.15);
  color: var(--status-error-text);
}
</style>
