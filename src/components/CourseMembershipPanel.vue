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
    <ul class="membership-list">
      <li v-for="row in rows" :key="row.id" class="membership-row">
        <span class="student-identity">
          <span class="student-number">{{ row.student_number }}</span>
          <span>{{ row.first_name }} {{ row.last_name }}</span>
        </span>
        <span class="membership-status">{{ row.withdrawn_at ? 'Withdrawn' : 'Active' }}</span>
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
    <form v-if="selected" class="membership-confirmation" @submit.prevent="confirm">
      <h3>
        {{ selected.withdrawn_at ? 'Restore membership for' : 'Withdraw' }}
        {{ selected.first_name }} {{ selected.last_name }}
        <small>{{ selected.student_number }}</small>
      </h3>
      <label
        >Reason<textarea v-model="reason" class="glass-input" required maxlength="1000" />
      </label>
      <div class="membership-actions">
        <button class="btn-primary" type="submit" :disabled="busy || !reason.trim()">
          {{ busy ? 'Saving…' : 'Confirm membership change' }}
        </button>
        <button class="btn-secondary" type="button" :disabled="busy" @click="selected = null">
          Cancel
        </button>
      </div>
    </form>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
  </section>
</template>
<style scoped>
.btn-secondary {
  border: 1px solid var(--glass-border);
  border-radius: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}
.btn-secondary:hover:not(:disabled) {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-highlight);
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.membership-list {
  list-style: none;
  padding: 0;
  margin-block: 1rem;
}
.membership-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem 12rem;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--table-divider);
}
.student-identity {
  display: grid;
  grid-template-columns: 9ch minmax(0, 1fr);
  gap: 1rem;
  overflow-wrap: anywhere;
}
.student-number {
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  .membership-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
  }
  .membership-row button {
    grid-column: 1 / -1;
    justify-self: stretch;
  }
  .student-identity {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.2rem;
  }
}
label {
  display: grid;
  gap: 0.4rem;
}
form {
  margin-block: 1rem;
}
.membership-confirmation {
  padding: 22px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-inset);
}
.membership-confirmation h3 {
  margin: 0 0 18px;
}
.membership-confirmation h3 small {
  display: block;
  font-size: 0.8rem;
  font-weight: 400;
  margin-top: 4px;
  color: var(--text-secondary);
}
.membership-confirmation textarea {
  min-height: 96px;
  width: 100%;
}
.membership-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}
.membership-actions button {
  min-height: 44px;
}
.membership-status {
  color: var(--text-secondary);
  font-size: 0.84rem;
}
@media (max-width: 640px) {
  .membership-actions {
    flex-direction: column;
  }
}
</style>
