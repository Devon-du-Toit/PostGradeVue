<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import {
  fetchEnrollmentHistory,
  withdrawEnrollment,
  restoreEnrollment,
} from '@/services/enrollments'
import type { EnrolledStudent } from '@/types/enrollment'
import { workflowError } from '@/utils/workflow'
const props = defineProps<{ courseId: number; refreshKey: number }>()
const emit = defineEmits<{ updated: [] }>()
const rows = ref<EnrolledStudent[]>([])
const selected = ref<EnrolledStudent | null>(null)
const reason = ref('')
const busy = ref(false)
const error = ref('')
const load = async () => {
  error.value = ''
  try {
    rows.value = await fetchEnrollmentHistory(props.courseId)
  } catch (cause) {
    rows.value = []
    error.value = workflowError(
      cause,
      'Membership history is unavailable. Check that the backend update is installed.',
    )
  }
}
onMounted(load)
watch(() => props.refreshKey, load)
const begin = (row: EnrolledStudent) => {
  selected.value = { ...row }
  reason.value = ''
  error.value = ''
}
const confirm = async () => {
  const row = selected.value
  if (!row || row.version === undefined || !reason.value.trim() || busy.value) return
  busy.value = true
  try {
    if (row.withdrawn_at) await restoreEnrollment(row.id, row.version, reason.value.trim())
    else await withdrawEnrollment(row.id, row.version, reason.value.trim())
    selected.value = null
    await load()
    emit('updated')
  } catch (cause) {
    error.value = workflowError(cause, 'Membership changed. Reload this course and try again.')
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="panel glass-panel">
    <h2>Course membership and withdrawals</h2>
    <p>
      Withdraw a student from this class while preserving their script and audit history. Other
      classes and the global student record remain unchanged. Restoring membership makes previously
      current scripts available again; archived and superseded scripts stay in history. Cancelled
      email deliveries are not restarted.
    </p>
    <button class="btn-secondary" type="button" :disabled="busy" @click="load">
      Refresh memberships
    </button>
    <ul>
      <li v-for="row in rows" :key="row.id">
        {{ row.student_number }} — {{ row.first_name }} {{ row.last_name }} ·
        {{ row.withdrawn_at ? 'Withdrawn' : 'Active' }}
        <button
          class="btn-secondary"
          type="button"
          :disabled="busy || row.version === undefined"
          @click="begin(row)"
        >
          {{ row.withdrawn_at ? 'Restore membership' : 'Withdraw from class' }}
        </button>
      </li>
    </ul>
    <form v-if="selected" @submit.prevent="confirm">
      <h3>
        {{ selected.withdrawn_at ? 'Restore' : 'Withdraw' }} {{ selected.student_number }} · version
        {{ selected.version }}
      </h3>
      <label
        >Reason<textarea v-model="reason" class="glass-input" required maxlength="1000" />
      </label>
      <button class="btn-primary" type="submit" :disabled="busy || !reason.trim()">
        {{ busy ? 'Saving…' : 'Confirm membership change' }}
      </button>
      <button class="btn-secondary" type="button" :disabled="busy" @click="selected = null">
        Cancel
      </button>
    </form>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
  </section>
</template>
<style scoped>
li {
  margin-block: 0.8rem;
}
label {
  display: grid;
  gap: 0.4rem;
}
form {
  margin-block: 1rem;
}
</style>
