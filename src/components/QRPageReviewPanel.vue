<script setup lang="ts">
import { computed, ref } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import {
  fetchSubmissions,
  fetchSubmissionPage,
  fetchSubmissionSource,
  reviewSubmissionPage,
  type PageReviewPayload,
} from '@/services/submissions'
import type { Submission, GroupedPage } from '@/types/submission'
import type { EnrolledStudent } from '@/types/enrollment'
import { savePrivateBlob, workflowError, orderedScriptPages } from '@/utils/workflow'

const props = defineProps<{
  submission: Submission
  students: EnrolledStudent[]
  groups?: Submission[]
  readonly?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const editing = ref<GroupedPage | null>(null)
const version = ref<number>()
const reason = ref('')
const qrValue = ref('')
const exclude = ref(false)
const identity = ref('unchanged')
const destination = ref('')
const destinationVersion = ref<number>()
const availableGroups = ref<Submission[]>([])
const error = ref('')
const studentLabel = (id: unknown) => {
  if (!id) return 'None'
  const student = props.students.find((item) => item.id === id)
  return student
    ? `${student.student_number} — ${student.first_name} ${student.last_name}`
    : props.readonly
      ? 'Recorded in verification history'
      : 'Student details unavailable; reload the class list'
}
const busy = ref(false)
const orderedPages = computed(() => orderedScriptPages(props.submission.grouped_pages))
const groups = computed(() =>
  (props.groups ?? availableGroups.value).filter(
    (group) => group.id !== props.submission.id && group.assessment === props.submission.assessment,
  ),
)
const begin = async (page: GroupedPage) => {
  editing.value = page
  version.value = props.submission.version
  reason.value = ''
  qrValue.value = ''
  exclude.value = page.excluded
  identity.value = 'unchanged'
  destination.value = ''
  destinationVersion.value = undefined
  error.value = ''
  if (!props.groups) {
    try {
      availableGroups.value = await fetchSubmissions({ assessment: props.submission.assessment })
    } catch (cause) {
      error.value = workflowError(cause, 'Could not load destination groups. Reload and try again.')
    }
  }
}
const chooseDestination = () => {
  destinationVersion.value = groups.value.find(
    (group) => group.id === Number(destination.value),
  )?.version
}
const save = async () => {
  if (!editing.value || version.value === undefined || !reason.value.trim() || busy.value) return
  const payload: PageReviewPayload = {
    version: version.value,
    reason: reason.value.trim(),
    exclude: exclude.value,
  }
  if (qrValue.value.trim()) payload.qr_value = qrValue.value.trim()
  if (identity.value !== 'unchanged')
    payload.reviewed_enrollment = identity.value === 'dismiss' ? null : Number(identity.value)
  if (destination.value) {
    if (destinationVersion.value === undefined) {
      error.value = 'Reload the destination group to get its current version.'
      return
    }
    payload.destination_submission = Number(destination.value)
    payload.destination_version = destinationVersion.value
  }
  busy.value = true
  error.value = ''
  try {
    await reviewSubmissionPage(props.submission.id, editing.value.id, payload)
    editing.value = null
    emit('updated')
  } catch (cause) {
    error.value = workflowError(
      cause,
      'Could not save page review. Reload this assessment and try again.',
    )
  } finally {
    busy.value = false
  }
}
const download = async (page: GroupedPage, source = false) => {
  error.value = ''
  try {
    const blob = source
      ? await fetchSubmissionSource(props.submission.id, page.upload_id)
      : await fetchSubmissionPage(props.submission.id, page.id)
    savePrivateBlob(
      blob,
      source
        ? `source-${page.upload_id}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`
        : `script-${props.submission.id}-page-${page.id}.pdf`,
    )
  } catch (cause) {
    error.value = workflowError(cause, 'Could not download this protected original file.')
  }
}
</script>

<template>
  <section v-if="submission.grouped_pages?.length" class="qr-panel" aria-label="QR script pages">
    <h3>QR pages · {{ submission.original_filename }}</h3>
    <p>{{ submission.qr_group_status?.replace(/_/g, ' ') }} · version {{ submission.version }}</p>
    <dl v-if="submission.qr_metadata" class="qr-metadata">
      <template v-for="(value, key) in submission.qr_metadata" :key="key"
        ><dt>{{ String(key).replace(/_/g, ' ') }}</dt>
        <dd>{{ value }}</dd></template
      >
    </dl>
    <AlertBox v-if="submission.qr_review_issues?.length" type="error"
      >Review required: {{ submission.qr_review_issues.join(', ') }}. Resolve these page issues
      before verifying or emailing.</AlertBox
    >
    <p>
      QR codes group full pages; the lecturer confirms the student separately. Source uploads may
      contain other students' scripts.
    </p>
    <article v-for="page in orderedPages" :key="page.id" class="qr-page glass-panel">
      <h4>
        {{ page.page_label || 'Unreadable page label' }} · source page {{ page.source_page }}
        <span v-if="page.excluded">(excluded)</span>
      </h4>
      <p>QR: {{ page.qr_status }} · recognition: {{ page.recognition_outcome || 'pending' }}</p>
      <p v-if="page.quality_issues.length">{{ page.quality_issues.join(', ') }}</p>
      <dl class="qr-metadata">
        <template v-for="(value, key) in page.qr_fields" :key="key"
          ><dt>{{ String(key).replace(/_/g, ' ') }}</dt>
          <dd>{{ value }}</dd></template
        >
      </dl>
      <p>
        Suggested student:
        {{ studentLabel(page.suggested_enrollment) }}
        · confirmed student: {{ studentLabel(page.linked_enrollment) }}
      </p>
      <div class="qr-actions">
        <button class="btn-secondary" type="button" @click="download(page)">
          Download original page</button
        ><button class="btn-secondary" type="button" @click="download(page, true)">
          Download source upload</button
        ><button
          v-if="!readonly"
          class="btn-secondary"
          type="button"
          :disabled="busy || submission.status === 'processing'"
          @click="begin(page)"
        >
          Review page
        </button>
      </div>
      <details v-if="page.review_history.length">
        <summary>Audited page reviews</summary>
        <p v-for="(review, index) in page.review_history" :key="index">
          {{ review.timestamp }} · Lecturer review · {{ review.reason }} · excluded
          {{ review.excluded }} · reviewed student {{ studentLabel(review.reviewed_enrollment) }}
        </p>
      </details>
    </article>
    <form v-if="editing && !readonly" class="qr-review-form glass-panel" @submit.prevent="save">
      <h4>Review {{ editing.page_label || 'unreadable page' }} using version {{ version }}</h4>
      <label
        >Corrected printed QR value (leave empty to retain)<input
          v-model="qrValue"
          class="glass-input"
          placeholder="CMPG211,20230412,KT2,P3,#1"
          maxlength="300"
      /></label>
      <label
        ><input v-model="exclude" type="checkbox" /> Exclude this duplicate/unwanted page from the
        script</label
      >
      <label
        >Reviewed student suggestion<select v-model="identity" class="glass-input">
          <option value="unchanged">Keep current suggestion</option>
          <option value="dismiss">Dismiss suggestion</option>
          <option v-for="student in students" :key="student.id" :value="String(student.id)">
            {{ student.student_number }} — {{ student.first_name }} {{ student.last_name }}
          </option>
        </select></label
      >
      <label
        >Move to another paper group<select
          v-model="destination"
          class="glass-input"
          @change="chooseDestination"
        >
          <option value="">Keep in this group</option>
          <option v-for="group in groups" :key="group.id" :value="String(group.id)">
            {{ group.original_filename }} · version {{ group.version }}
          </option>
        </select></label
      >
      <label
        >Review reason<textarea v-model="reason" class="glass-input" required maxlength="1000" />
      </label>
      <p>
        This preserves originals and audit history, invalidates prior verification, and requires
        renewed student confirmation.
      </p>
      <div class="qr-actions">
        <button
          class="btn-primary"
          type="submit"
          :disabled="busy || !reason.trim() || version === undefined"
        >
          {{ busy ? 'Saving…' : 'Save page review' }}</button
        ><button class="btn-secondary" type="button" :disabled="busy" @click="editing = null">
          Cancel
        </button>
      </div>
    </form>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
  </section>
</template>

<style scoped>
.qr-panel {
  margin-block: 1rem;
}
.qr-page,
.qr-review-form {
  padding: 1rem;
  margin-block: 0.8rem;
}
.qr-metadata {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.3rem 1rem;
}
.qr-metadata dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.qr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.qr-review-form label {
  display: grid;
  gap: 0.4rem;
  margin-block: 0.7rem;
}
</style>
