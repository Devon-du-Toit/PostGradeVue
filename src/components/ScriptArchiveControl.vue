<script setup lang="ts">
import { ref } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import { archiveScript } from '@/services/submissions'
import type { Submission } from '@/types/submission'
import { workflowError } from '@/utils/workflow'
const props = defineProps<{ submission: Submission }>()
const emit = defineEmits<{ updated: [] }>()
const open = ref(false)
const version = ref<number>()
const reason = ref('')
const error = ref('')
const busy = ref(false)
const begin = () => {
  version.value = props.submission.version
  open.value = true
  reason.value = ''
  error.value = ''
}
const archive = async () => {
  if (busy.value || !reason.value.trim() || version.value === undefined) return
  busy.value = true
  try {
    await archiveScript(props.submission.id, version.value, reason.value.trim())
    open.value = false
    emit('updated')
  } catch (cause) {
    error.value = workflowError(cause, 'Could not archive this script. Reload and try again.')
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="archive-control">
    <button v-if="!open" class="btn-secondary" type="button" @click="begin">Archive script</button>
    <form v-else @submit.prevent="archive">
      <p>
        Archive this script using version {{ version }}. Its original files and audit history remain
        available in read-only history; it cannot be emailed.
      </p>
      <label
        >Archive reason<input v-model="reason" class="glass-input" required maxlength="1000"
      /></label>
      <button
        class="btn-secondary"
        type="submit"
        :disabled="busy || !reason.trim() || version === undefined"
      >
        {{ busy ? 'Archiving…' : 'Confirm archive' }}
      </button>
      <button class="btn-secondary" type="button" :disabled="busy" @click="open = false">
        Cancel
      </button>
    </form>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
  </div>
</template>
<style scoped>
.archive-control {
  margin-block: 0.6rem;
}
label {
  display: grid;
  gap: 0.4rem;
}
</style>
