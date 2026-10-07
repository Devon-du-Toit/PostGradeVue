<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { fetchAssessment } from '@/services/assessments'
import { fetchCourseEnrollments } from '@/services/enrollments'
import { fetchVerificationQueue, verifySubmission } from '@/services/submissions'
import type { Assessment } from '@/types/assessment'
import type { EnrolledStudent } from '@/types/enrollment'
import type { Submission } from '@/types/submission'
import AlertBox from '@/components/AlertBox.vue'
import SubmissionReviewPanel from '@/components/SubmissionReviewPanel.vue'
import { workflowError, orderedScriptPages } from '@/utils/workflow'

const route = useRoute()
const router = useRouter()

const submissions = ref<Submission[]>([])
const assessments = reactive<Record<number, Assessment>>({})
const studentsByAssessment = reactive<Record<number, EnrolledStudent[]>>({})
const selections = reactive<Record<number, number | null>>({})
const loading = ref(true)
const verifyingId = ref<number | null>(null)
const error = ref('')
const successMessage = ref('')
const reviewingId = ref<number | null>(null)
const qrBlocked = (submission: Submission) =>
  submission.status === 'processing' ||
  submission.qr_group_status === 'manual_review' ||
  Boolean(submission.qr_review_issues?.length)
const panel = ref<InstanceType<typeof SubmissionReviewPanel> | null>(null)

// 1. URL Syncing: Initialize filters from URL
const filters = reactive({
  search: (route.query.search as string) || '',
  status: (route.query.status as string) || '',
})

let abortController: AbortController | null = null
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const loadQueue = async () => {
  loading.value = true
  error.value = ''

  // 2. Cancel stale requests
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  try {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter((entry) => entry[1] !== '' && entry[1] !== null),
    )

    const queue = await fetchVerificationQueue(activeFilters, abortController.signal)
    submissions.value = queue

    const assessmentIds = [...new Set(queue.map((submission) => submission.assessment))]

    await Promise.all(
      assessmentIds.map(async (assessmentId) => {
        // Optimization: Don't re-fetch enrollments if we already have them for this assessment
        if (!assessments[assessmentId]) {
          const assessment = await fetchAssessment(assessmentId)
          assessments[assessmentId] = assessment

          studentsByAssessment[assessmentId] = await fetchCourseEnrollments(assessment.course)
        }
      }),
    )

    for (const submission of queue) {
      selections[submission.id] = submission.enrollment
    }
  } catch (e) {
    const err = e as { name?: string; code?: string }
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return

    error.value = 'Could not load the verification queue.'
    submissions.value = []
  } finally {
    loading.value = false
  }
}

// 3. Debounce and sync URL
watch(
  filters,
  (newFilters) => {
    const query = Object.fromEntries(
      Object.entries(newFilters).filter((entry) => entry[1] !== '' && entry[1] !== null),
    )
    void router.replace({ query })

    if (debounceTimeout) clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      void loadQueue()
    }, 300)
  },
  { deep: true },
)

const verify = async (submission: Submission) => {
  if (qrBlocked(submission)) return
  const enrollment = selections[submission.id]

  if (typeof enrollment !== 'number') {
    error.value = 'Select a student before verifying the submission.'
    return
  }

  verifyingId.value = submission.id
  error.value = ''
  successMessage.value = ''

  try {
    const verified = await verifySubmission(submission.id, enrollment, submission.version)
    submissions.value = submissions.value.filter((item) => item.id !== verified.id)
    successMessage.value = `Verified ${verified.original_filename}.`
  } catch (cause) {
    error.value = workflowError(
      cause,
      'Could not verify the selected student. Open Review to check the page evidence.',
    )
  } finally {
    verifyingId.value = null
  }
}

const studentsFor = (submission: Submission) => {
  return studentsByAssessment[submission.assessment] ?? []
}

const matchedStudent = (submission: Submission) => {
  if (!submission.enrollment) return null
  return studentsFor(submission).find((student) => student.id === submission.enrollment) ?? null
}

const reviewIndex = computed(() =>
  submissions.value.findIndex((submission) => submission.id === reviewingId.value),
)
const reviewing = computed(() => submissions.value[reviewIndex.value] ?? null)
const hasNext = computed(
  () => reviewIndex.value >= 0 && reviewIndex.value < submissions.value.length - 1,
)

const openReview = async (submission: Submission) => {
  reviewingId.value = submission.id
  successMessage.value = ''
  await nextTick()
  // Focus the panel so its keyboard shortcuts work straight away.
  ;(panel.value?.$el as HTMLElement | undefined)?.focus()
}

const reviewNext = () => {
  const next = submissions.value[reviewIndex.value + 1]
  if (next) void openReview(next)
}

// The reviewed submission leaves the queue; move on to the one that took its place.
const removeAndAdvance = (submissionId: number, message: string) => {
  const index = submissions.value.findIndex((item) => item.id === submissionId)
  submissions.value = submissions.value.filter((item) => item.id !== submissionId)
  successMessage.value = message
  const next = submissions.value[Math.min(index, submissions.value.length - 1)]
  if (next) {
    void openReview(next)
    successMessage.value = message
  } else {
    reviewingId.value = null
  }
}

const onVerified = (verified: Submission) => {
  removeAndAdvance(verified.id, `Verified ${verified.original_filename}.`)
}

const onRetried = (retried: Submission) => {
  removeAndAdvance(retried.id, `Recognition restarted for ${retried.original_filename}.`)
}

onMounted(() => {
  void loadQueue()
})
</script>

<template>
  <main class="queue-page">
    <RouterLink class="back-link" to="/dashboard">← Back to dashboard</RouterLink>

    <header class="page-header">
      <h1>Verification queue</h1>
      <p>Review student-number matches that still need lecturer confirmation.</p>
    </header>

    <p v-if="loading" class="status-text loading-text">Loading verification queue…</p>
    <AlertBox v-else-if="error && submissions.length === 0" type="error">{{ error }}</AlertBox>

    <AlertBox v-if="successMessage" type="success">{{ successMessage }}</AlertBox>

    <SubmissionReviewPanel
      v-if="reviewing && !loading"
      ref="panel"
      :submission="reviewing"
      :students="studentsFor(reviewing)"
      :assessment-name="assessments[reviewing.assessment]?.name"
      :has-next="hasNext"
      @verified="onVerified"
      @retried="onRetried"
      @updated="loadQueue"
      @next="reviewNext"
      @close="reviewingId = null"
    />

    <section v-if="!loading && !(error && submissions.length === 0)" class="panel glass-panel">
      <div class="list-header">
        <div class="filters-bar">
          <input
            class="glass-input search-input"
            v-model="filters.search"
            placeholder="Search filename or student..."
          />
          <select class="glass-input" v-model="filters.status">
            <option value="">All statuses</option>
            <option value="needs_verification">Needs verification</option>
            <option value="matched">Matched (confirm)</option>
          </select>
        </div>
      </div>

      <p v-if="submissions.length === 0 && !loading" class="empty-state status-text">
        No submissions found matching those filters.
      </p>

      <div v-else-if="submissions.length > 0" class="queue-table-wrap">
        <table class="queue-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Assessment</th>
              <th>Recognition suggestion</th>
              <th>Confirm student</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="submission in submissions"
              :key="submission.id"
              :class="{ 'is-reviewing': submission.id === reviewingId }"
            >
              <td class="filename-cell">
                {{ submission.original_filename }}
                <p v-if="submission.qr_metadata?.test_number">
                  Paper {{ submission.qr_metadata.test_number }} ·
                  {{
                    orderedScriptPages(submission.grouped_pages)
                      .filter((page) => !page.excluded)
                      .map((page) => page.page_label || 'Unreadable label')
                      .join(', ')
                  }}
                </p>
              </td>
              <td>
                <RouterLink class="assessment-link" :to="`/assessments/${submission.assessment}`">
                  {{
                    assessments[submission.assessment]?.name ??
                    `Assessment ${submission.assessment}`
                  }}
                </RouterLink>
              </td>
              <td class="ocr-cell">
                <template v-if="matchedStudent(submission)">
                  <span class="ocr-match">
                    {{ matchedStudent(submission)?.student_number }} —
                    {{ matchedStudent(submission)?.first_name }}
                    {{ matchedStudent(submission)?.last_name }}
                  </span>
                </template>
                <span v-else class="ocr-no-match">No confident match</span>
              </td>
              <td>
                <div class="verification-controls">
                  <button
                    class="btn-secondary review-button"
                    type="button"
                    @click="openReview(submission)"
                  >
                    Review
                  </button>
                  <!-- Applied glass-input and custom dropdown styling -->
                  <select class="glass-input" v-model.number="selections[submission.id]">
                    <option :value="null" disabled>Select student</option>
                    <option
                      v-for="student in studentsFor(submission)"
                      :key="student.id"
                      :value="student.id"
                    >
                      {{ student.student_number }} — {{ student.first_name }}
                      {{ student.last_name }}
                    </option>
                  </select>

                  <!-- Applied btn-primary -->
                  <button
                    class="btn-primary"
                    type="button"
                    :disabled="verifyingId === submission.id || qrBlocked(submission)"
                    @click="verify(submission)"
                  >
                    {{ verifyingId === submission.id ? 'Verifying…' : 'Verify' }}
                  </button>
                </div>
                <p v-if="submission.qr_review_issues?.length">
                  Page review required: {{ submission.qr_review_issues.join(', ') }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AlertBox v-if="error && submissions.length > 0" type="error">{{ error }}</AlertBox>
  </main>
</template>

<style scoped>
.queue-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.back-link:hover {
  color: var(--accent-green);
  transform: translateX(-4px);
}

.page-header {
  margin-bottom: 2.5rem;
}

.page-header h1 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.page-header p {
  color: var(--text-secondary);
  margin: 0;
}

.panel {
  padding: 2rem;
}

/* Data Table Styling */
.queue-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--surface-inset);
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
}

.queue-table th {
  padding: 1rem;
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  background: var(--surface-header);
  color: var(--accent-green);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.queue-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--table-divider);
  text-align: left;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.queue-table tr:last-child td {
  border-bottom: none;
}

.queue-table tr:hover td {
  background: var(--surface-hover);
}

.filename-cell {
  font-family: monospace;
  color: var(--text-secondary) !important;
  font-size: 0.9rem !important;
}

.assessment-link {
  color: var(--accent-green);
  text-decoration: none;
  font-weight: 500;
}

.assessment-link:hover {
  text-decoration: underline;
}

.ocr-match {
  color: var(--text-primary);
}

.ocr-no-match {
  color: var(--status-warning);
  font-style: italic;
  font-size: 0.85rem;
}

.queue-table tr.is-reviewing td {
  background: rgba(91, 166, 91, 0.08);
}

.review-button {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.verification-controls {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: center;
}

/* Custom dropdown arrow for table inputs */
select.glass-input {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 0.5rem top 50%;
  background-size: 0.65rem auto;
  padding-right: 1.5rem;
  min-width: 200px;
}

select.glass-input option {
  background: var(--surface-option);
  color: var(--text-primary);
}

.status-text {
  color: var(--text-muted);
  font-style: italic;
}

.loading-text {
  font-size: 1.1rem;
  margin-top: 2rem;
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.filters-bar {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

.filters-bar > * {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0;
}

@media (max-width: 720px) {
  .filters-bar {
    grid-template-columns: 1fr;
  }
}
</style>
