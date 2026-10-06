<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchAssessment } from '@/services/assessments'
import { fetchCourseEnrollments } from '@/services/enrollments'
import {
  fetchSubmissions,
  fetchRecognitionMethods,
  emailSubmission,
  uploadSubmission,
  verifySubmission,
} from '@/services/submissions'
import type { Assessment } from '@/types/assessment'
import type { EnrolledStudent } from '@/types/enrollment'
import type { RecognitionMethod, Submission } from '@/types/submission'
import AlertBox from '@/components/AlertBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ScriptEmailPanel from '@/components/ScriptEmailPanel.vue'

interface QueuedUpload {
  id: string
  file: File
  recognitionMethod: RecognitionMethod
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
  message?: string
}

const route = useRoute()
const assessmentId = Number(route.params.id)

const assessment = ref<Assessment | null>(null)
const students = ref<EnrolledStudent[]>([])
const submissions = ref<Submission[]>([])
const loading = ref(true)
const uploadQueue = ref<QueuedUpload[]>([])
const verifyingSubmissionId = ref<number | null>(null)
const emailingSubmissionId = ref<number | null>(null)
const isProcessingQueue = ref(false)
const recognitionMethod = ref<RecognitionMethod>('ocr')
const bubbleAvailable = ref(false)
const methodMessage = ref('')
const loadRecognitionMethods = async () => {
  try {
    const capabilities = await fetchRecognitionMethods()
    bubbleAvailable.value = capabilities.methods.some((method) => method.value === 'bubble')
    if (!bubbleAvailable.value)
      methodMessage.value =
        'Bubble recognition is unavailable. Use handwritten digits or try again later.'
  } catch {
    methodMessage.value =
      'Bubble recognition is unavailable. Use handwritten digits or try again later.'
  }
}
const error = ref('')
const successMessage = ref('')
const emailRefreshKey = ref(0)

const verificationSelections = reactive<Record<number, number | null>>({})

const studentByEnrollment = computed(() => {
  return new Map(students.value.map((student) => [student.id, student]))
})

const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const assessmentData = await fetchAssessment(assessmentId)
    assessment.value = assessmentData

    const [enrollmentData, submissionData] = await Promise.all([
      fetchCourseEnrollments(assessmentData.course),
      fetchSubmissions({ assessment: assessmentId }),
    ])

    students.value = enrollmentData
    // The server filters by assessment (#11); this also keeps the page correct
    // against a backend that ignores ?assessment= (rollout compatibility).
    submissions.value = submissionData.filter(
      (submission) => submission.assessment === assessmentId,
    )

    for (const submission of submissions.value) {
      verificationSelections[submission.id] = submission.enrollment
    }
    // Resume polling if there are unfinished submissions on load
    if (submissions.value.some((s) => s.status === 'processing')) {
      startPolling()
    }
  } catch {
    error.value = 'Could not load assessment data.'
  } finally {
    loading.value = false
  }
}

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const handleSubmissionFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  Array.from(input.files).forEach((file) => {
    // 1. Handle unsupported files
    if (!ALLOWED_TYPES.includes(file.type)) {
      uploadQueue.value.push({
        id: crypto.randomUUID(),
        file,
        recognitionMethod: recognitionMethod.value,
        status: 'error',
        message: 'Unsupported format. Use PDF, JPG, or PNG.',
      })
      return
    }

    // 2. Handle documented limits (15 MB)
    if (file.size > MAX_FILE_SIZE) {
      uploadQueue.value.push({
        id: crypto.randomUUID(),
        file,
        recognitionMethod: recognitionMethod.value,
        status: 'error',
        message: 'File too large (max 15 MB).',
      })
      return
    }

    uploadQueue.value.push({
      id: crypto.randomUUID(),
      file,
      recognitionMethod: recognitionMethod.value,
      status: 'pending',
    })
  })

  input.value = ''
  error.value = ''
}

const removeQueuedFile = (id: string) => {
  uploadQueue.value = uploadQueue.value.filter((q) => q.id !== id)
}

const processUploadQueue = async () => {
  isProcessingQueue.value = true

  const pendingUploads = uploadQueue.value.filter(
    (q) => q.status === 'pending' || q.status === 'error',
  )

  for (const item of pendingUploads) {
    item.status = 'uploading'
    item.message = undefined

    try {
      const submission = await uploadSubmission(assessmentId, item.file, item.recognitionMethod)

      // Update local state
      item.status = 'success'
      submissions.value.unshift(submission) // Add to top of table
      verificationSelections[submission.id] = submission.enrollment

      // Trigger background polling if the backend says it is crunching the OCR
      if (submission.status === 'processing') {
        startPolling()
      }
    } catch (e) {
      const err = e as {
        response?: {
          data?: {
            message?: string
          }
        }
      }
      item.status = 'error'
      item.message = err.response?.data?.message || 'Upload failed. Click to retry.'
    }
  }

  isProcessingQueue.value = false
}
const confirmSubmission = async (submission: Submission) => {
  const enrollment = verificationSelections[submission.id]

  if (typeof enrollment !== 'number') {
    error.value = 'Select a student before verifying the submission.'
    return
  }

  verifyingSubmissionId.value = submission.id
  error.value = ''
  successMessage.value = ''

  try {
    const verified = await verifySubmission(submission.id, enrollment)
    const index = submissions.value.findIndex((item) => item.id === verified.id)

    if (index >= 0) {
      submissions.value[index] = verified
    }

    verificationSelections[verified.id] = verified.enrollment

    emailRefreshKey.value += 1

    successMessage.value = `Verified ${verified.original_filename}.`
  } catch {
    error.value = 'Could not verify submission for that student.'
  } finally {
    verifyingSubmissionId.value = null
  }
}

const sendScript = async (submission: Submission) => {
  emailingSubmissionId.value = submission.id
  error.value = ''
  successMessage.value = ''
  try {
    const delivery = await emailSubmission(submission.id)
    emailRefreshKey.value += 1
    successMessage.value =
      delivery.status === 'failed'
        ? 'Script delivery needs attention. Check its email status below.'
        : delivery.status === 'awaiting_approval'
          ? 'Script email is awaiting approval.'
          : delivery.status === 'sent'
            ? 'This verified script has already been emailed.'
            : 'Script email is scheduled. Check its delivery status below.'
  } catch (cause) {
    error.value =
      (cause as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
      'Could not schedule the script email. Verify the student first.'
  } finally {
    emailingSubmissionId.value = null
  }
}

// --- Background Polling Logic ---
let pollingTimeout: ReturnType<typeof setTimeout> | null = null
let isPolling = false
let isUnmounted = false
let pollingController: AbortController | null = null

const poll = async () => {
  if (!isPolling) return

  // Check if any submission is currently processing
  const hasProcessing = submissions.value.some((s) => s.status === 'processing')

  if (!hasProcessing) {
    stopPolling()
    return
  }

  const controller = new AbortController()
  pollingController = controller
  try {
    // Ask the server for this assessment only; keep the rollout fallback below.
    const latestSubmissions = await fetchSubmissions(
      { assessment: assessmentId },
      controller.signal,
    )
    if (!isPolling || controller.signal.aborted) return
    const assessmentSubs = latestSubmissions.filter((s) => s.assessment === assessmentId)

    // Update our local state with the newly processed data
    for (const updated of assessmentSubs) {
      const index = submissions.value.findIndex((s) => s.id === updated.id)
      const existingSubmission = submissions.value[index]

      if (existingSubmission && existingSubmission.status !== updated.status) {
        submissions.value[index] = updated

        // If it just finished processing, map the new results
        if (
          updated.status === 'matched' ||
          updated.status === 'needs_verification' ||
          updated.status === 'recognition_failed'
        ) {
          verificationSelections[updated.id] = updated.enrollment
        }
      }
    }
  } catch {
    // Silently ignore polling network errors
  } finally {
    pollingController = null
    // Re-arm only after completion, while this assessment still has work.
    if (isPolling && submissions.value.some((s) => s.status === 'processing')) {
      pollingTimeout = setTimeout(poll, 3000)
    } else {
      stopPolling()
    }
  }
}

const startPolling = () => {
  if (isPolling || isUnmounted) return
  isPolling = true
  void poll()
}

const stopPolling = () => {
  isPolling = false
  pollingController?.abort()
  pollingController = null
  if (pollingTimeout) {
    clearTimeout(pollingTimeout)
    pollingTimeout = null
  }
}
// Prevent accidental navigation while uploading
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isProcessingQueue.value) {
    e.preventDefault()
    e.returnValue = 'Uploads are currently in progress. Are you sure you want to leave?'
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  void loadRecognitionMethods()
  void loadPage()
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  isUnmounted = true
  stopPolling()
})
</script>

<template>
  <main class="assessment-detail-page">
    <p v-if="loading" class="status-text loading-text">Loading assessment…</p>
    <p v-else-if="error && !assessment" class="error-box">{{ error }}</p>

    <template v-else-if="assessment">
      <RouterLink class="back-link" :to="`/courses/${assessment.course}`"
        >← Back to course</RouterLink
      >

      <header class="page-header">
        <h1>{{ assessment.name }}</h1>
        <p class="assessment-date">{{ assessment.date }}</p>
      </header>

      <!-- Submissions Panel -->
      <section class="panel glass-panel">
        <h2>Submissions</h2>
        <p class="section-desc">
          Upload a scanned submission. PostGrade will run recognition automatically and either
          suggest a student match or place the file into verification.
        </p>

        <label class="recognition-method-label">
          Student number format
          <select class="glass-input" v-model="recognitionMethod" :disabled="isProcessingQueue">
            <option value="ocr">Handwritten digits (OCR)</option>
            <option value="bubble" :disabled="!bubbleAvailable">Filled bubbles</option>
          </select>
        </label>
        <p class="section-desc">
          Choose the format before selecting files. Bubble recognition reads only filled bubbles,
          never the written digits.
        </p>
        <p v-if="methodMessage" class="section-desc">{{ methodMessage }}</p>
        <div class="upload-controls">
          <!-- Added 'multiple' attribute -->
          <input
            class="file-input"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            @change="handleSubmissionFileChange"
          />
          <button
            class="btn-primary"
            type="button"
            :disabled="isProcessingQueue || uploadQueue.length === 0"
            @click="processUploadQueue"
          >
            {{ isProcessingQueue ? 'Processing queue…' : 'Upload queue' }}
          </button>
        </div>

        <!-- The Multi-File Queue UI -->
        <div v-if="uploadQueue.length > 0" class="upload-queue panel glass-panel">
          <h3>Upload Queue</h3>
          <ul class="queue-list">
            <li v-for="item in uploadQueue" :key="item.id" class="queue-item" :class="item.status">
              <div class="file-info">
                <strong>{{ item.file.name }}</strong>
                <span>{{
                  item.recognitionMethod === 'bubble'
                    ? 'Filled bubbles'
                    : 'Handwritten digits (OCR)'
                }}</span>
                <span class="file-size">{{ (item.file.size / 1024 / 1024).toFixed(2) }} MB</span>
              </div>

              <div class="status-info">
                <span v-if="item.status === 'pending'" class="status-badge">Ready</span>
                <span v-else-if="item.status === 'uploading'" class="status-badge text-warning"
                  >Uploading...</span
                >
                <span v-else-if="item.status === 'success'" class="status-badge text-success"
                  >Success</span
                >

                <div v-if="item.status === 'error'" class="error-group">
                  <span class="status-badge text-error">{{ item.message }}</span>
                  <button
                    class="btn-text btn-retry"
                    @click="
                      () => {
                        item.status = 'pending'
                        processUploadQueue()
                      }
                    "
                  >
                    Retry
                  </button>
                </div>

                <button
                  v-if="item.status === 'pending' || item.status === 'error'"
                  class="btn-text btn-remove"
                  @click="removeQueuedFile(item.id)"
                >
                  ✕
                </button>
              </div>
            </li>
          </ul>
        </div>

        <p v-if="submissions.length === 0" class="empty-state status-text">
          No submissions uploaded for this assessment yet.
        </p>

        <div v-else class="table-wrap submissions-wrap">
          <table class="glass-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Student</th>
                <th>Verification / delivery</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="submission in submissions" :key="submission.id">
                <td class="filename-cell">{{ submission.original_filename }}</td>
                <td>
                  <StatusBadge :status="submission.status" />
                </td>
                <td>
                  <template v-if="submission.enrollment">
                    <span class="student-number">{{
                      studentByEnrollment.get(submission.enrollment)?.student_number ?? 'Unknown'
                    }}</span>
                    <span
                      v-if="studentByEnrollment.get(submission.enrollment)"
                      class="student-name"
                    >
                      — {{ studentByEnrollment.get(submission.enrollment)?.first_name }}
                      {{ studentByEnrollment.get(submission.enrollment)?.last_name }}
                    </span>
                  </template>
                  <span v-else class="status-text warning-text">Not matched</span>
                </td>
                <td>
                  <template
                    v-if="
                      submission.status === 'matched' ||
                      submission.status === 'needs_verification' ||
                      submission.status === 'recognition_failed' ||
                      (submission.status === 'verified' && !submission.enrollment)
                    "
                  >
                    <div class="verification-controls">
                      <select
                        class="glass-input"
                        v-model.number="verificationSelections[submission.id]"
                      >
                        <option :value="null" disabled>Select student</option>
                        <option v-for="student in students" :key="student.id" :value="student.id">
                          {{ student.student_number }} — {{ student.first_name }}
                          {{ student.last_name }}
                        </option>
                      </select>
                      <button
                        class="btn-primary"
                        type="button"
                        :disabled="verifyingSubmissionId === submission.id"
                        @click="confirmSubmission(submission)"
                      >
                        {{
                          verifyingSubmissionId === submission.id
                            ? 'Verifying…'
                            : submission.status === 'matched'
                              ? 'Confirm match'
                              : 'Verify'
                        }}
                      </button>
                    </div>
                  </template>

                  <template v-else-if="submission.status === 'verified'">
                    <button
                      class="btn-primary"
                      type="button"
                      :disabled="emailingSubmissionId === submission.id"
                      @click="sendScript(submission)"
                    >
                      {{ emailingSubmissionId === submission.id ? 'Scheduling…' : 'Email script' }}
                    </button>
                  </template>

                  <span v-else class="status-text">{{
                    submission.status === 'processing'
                      ? 'Recognition in progress'
                      : 'Waiting for recognition'
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ScriptEmailPanel :assessment-id="assessmentId" :refresh-key="emailRefreshKey" />

      <AlertBox v-if="successMessage" type="success">{{ successMessage }}</AlertBox>
      <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    </template>
  </main>
</template>

<style scoped>
.assessment-detail-page {
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
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 2.2rem;
}

.assessment-date {
  color: var(--accent-green);
  font-weight: 600;
  margin: 0;
}

.panel {
  margin-bottom: 2.5rem;
  padding: 2rem;
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Stats panel styling */
.stats-panel {
  padding: 1.5rem 2rem;
  background: var(--surface-header);
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3rem;
  margin: 0;
}

.stat-item dt {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.stat-item dd {
  margin: 0.25rem 0 0;
  color: var(--accent-green);
  font-size: 1.8rem;
  font-weight: 700;
}

/* Forms and Inputs */
.upload-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.file-input {
  color: var(--text-secondary);
}

.file-input::file-selector-button {
  background: var(--surface-input);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.65rem 1rem;
  margin-right: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.file-input::file-selector-button:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-highlight);
}

.verification-controls {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: center;
}

/* Data Tables */
.table-wrap {
  margin-top: 1rem;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--surface-inset);
}

.glass-table {
  width: 100%;
  border-collapse: collapse;
}

.glass-table th {
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

.glass-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--table-divider);
  text-align: left;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.glass-table tr:last-child td {
  border-bottom: none;
}

.glass-table tr:hover td {
  background: var(--surface-hover);
}

.filename-cell {
  font-family: monospace;
  color: var(--text-secondary) !important;
  font-size: 0.9rem !important;
}

.student-number {
  font-family: monospace;
  color: var(--text-secondary);
}

.student-name {
  color: var(--text-primary);
}

/* Custom dropdown arrow for verification */
select.glass-input {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 0.5rem top 50%;
  background-size: 0.65rem auto;
  padding-right: 1.5rem;
  min-width: 180px;
}
select.glass-input option {
  background: var(--surface-option);
  color: var(--text-primary);
}

.status-text {
  color: var(--text-muted);
  font-style: italic;
}
.warning-text {
  color: var(--status-warning);
}

.loading-text {
  font-size: 1.1rem;
  margin-top: 2rem;
}

.empty-state {
  margin-top: 1rem;
}

/* Upload Queue Styles */
.upload-queue {
  margin: 1.5rem 0 2.5rem;
  padding: 1.5rem;
  background: var(--surface-header);
}

.upload-queue h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.queue-item.success {
  border-color: rgba(34, 197, 94, 0.3);
}
.queue-item.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-info strong {
  color: var(--text-primary);
  font-size: 0.95rem;
}
.file-size {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-badge {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--surface-header);
}

.text-success {
  color: var(--status-success-text);
}
.text-warning {
  color: var(--status-warning-text);
}
.text-error {
  color: var(--status-error-text);
}

.error-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
}

.btn-text:hover {
  color: var(--text-primary);
}
.btn-retry {
  color: var(--pg-blue, #3b82f6);
  text-decoration: underline;
}

.error-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--status-error-text);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 2rem;
  font-weight: 500;
}
</style>
