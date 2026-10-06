<script setup lang="ts">
import { ref, watch } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import QRPageReviewPanel from '@/components/QRPageReviewPanel.vue'
import {
  fetchScriptHistory,
  fetchHistoryScript,
  fetchSubmissionRevision,
} from '@/services/submissions'
import type { Submission, FileRevision } from '@/types/submission'
import { savePrivateBlob, workflowError } from '@/utils/workflow'
const props = defineProps<{ assessmentId: number; refreshKey: number }>()
const rows = ref<Submission[]>([])
const open = ref(false)
const busy = ref(false)
const error = ref('')
const load = async () => {
  open.value = true
  busy.value = true
  error.value = ''
  try {
    rows.value = await fetchScriptHistory(props.assessmentId)
  } catch (cause) {
    error.value = workflowError(
      cause,
      'Script history is unavailable. Please reload or check the backend update.',
    )
  } finally {
    busy.value = false
  }
}
watch(
  () => props.refreshKey,
  () => {
    if (open.value) void load()
  },
)
const download = async (row: Submission, revision?: FileRevision) => {
  try {
    const blob = revision
      ? await fetchSubmissionRevision(row.id, revision.id)
      : await fetchHistoryScript(row.id)
    savePrivateBlob(blob, revision?.original_filename ?? row.original_filename)
  } catch (cause) {
    error.value = workflowError(cause, 'Could not download this protected history file.')
  }
}
const identity = (row: Submission) => {
  const recorded = row.student_identity?.student_number
    ? row.student_identity
    : row.audit_entries?.find((entry) => entry.new_identity?.student_number)?.new_identity
  return recorded?.student_number
    ? `${recorded.student_number} ${recorded.first_name ?? ''} ${recorded.last_name ?? ''}`.trim()
    : row.enrollment
      ? 'Student identity recorded in verification history'
      : 'Unconfirmed student identity'
}
</script>
<template>
  <section class="panel glass-panel">
    <h2>Script history</h2>
    <p>
      Archived, superseded and original file revisions remain read-only. Only the current active
      script can be verified or emailed.
    </p>
    <button class="btn-secondary" type="button" :disabled="busy" @click="load">
      {{ busy ? 'Loading history…' : open ? 'Refresh history' : 'View script history' }}
    </button>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <p v-if="open && !busy && !rows.length && !error">No script history yet.</p>
    <article v-for="row in rows" :key="row.id" class="history-row">
      <h3>{{ row.original_filename }}</h3>
      <p>
        {{
          row.archived_at
            ? `Archived ${row.archived_at}`
            : row.superseded_at
              ? `Superseded ${row.superseded_at} by ${rows.find((item) => item.id === row.superseded_by)?.original_filename ?? 'a later script'}`
              : 'Current active script'
        }}
        · version {{ row.version }} · {{ identity(row) }}
      </p>
      <button class="btn-secondary" type="button" @click="download(row)">
        Download original script
      </button>
      <ul v-if="row.file_revisions?.length">
        <li v-for="revision in row.file_revisions" :key="revision.id">
          Version {{ revision.version }} · {{ revision.created_at }} ·
          {{ revision.original_filename }}
          <span v-if="revision.student_identity?.student_number">
            · {{ revision.student_identity.student_number }}
            {{ revision.student_identity.first_name }}
            {{ revision.student_identity.last_name }}</span
          >
          <button class="btn-secondary" type="button" @click="download(row, revision)">
            Download revision
          </button>
        </li>
      </ul>
      <details v-if="row.audit_entries?.length">
        <summary>Verification and lifecycle audit history</summary>
        <p v-for="entry in row.audit_entries" :key="entry.id">
          {{ entry.timestamp }} · {{ entry.actor === null ? 'System' : 'Lecturer' }} ·
          {{ entry.previous_status }} → {{ entry.new_status }} ·
          {{
            entry.new_identity.student_number ||
            entry.previous_identity.student_number ||
            'No student identity'
          }}
          · {{ entry.reason }}
          <span
            v-if="
              entry.new_identity.origin === 'migration_current_reference' ||
              entry.previous_identity.origin === 'migration_current_reference'
            "
          >
            · legacy identity backfill from the migration's current reference</span
          >
        </p>
      </details>
      <QRPageReviewPanel :submission="row" :students="[]" readonly />
    </article>
  </section>
</template>
<style scoped>
.history-row {
  margin-top: 1rem;
  padding-block: 1rem;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
}
li {
  margin-block: 0.5rem;
}
</style>
