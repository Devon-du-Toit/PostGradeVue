<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import AlertBox from '@/components/AlertBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  fetchRecognitionImage,
  fetchSubmissionFile,
  retryRecognition,
  verifySubmission,
} from '@/services/submissions'
import type { GradebookStudent } from '@/types/gradebook'
import type { Submission } from '@/types/submission'
import {
  canRetryRecognition,
  preselectedEnrollment,
  summarizeRecognition,
  uncertainPositions,
} from '@/utils/recognition'

const props = defineProps<{
  submission: Submission
  students: GradebookStudent[]
  assessmentName?: string
  hasNext: boolean
}>()

const emit = defineEmits<{
  verified: [submission: Submission]
  retried: [submission: Submission]
  next: []
  close: []
}>()

type Preview = { url: string; isPdf: boolean }

const selected = ref<number | null>(null)
const crop = ref<Preview | null>(null)
const script = ref<Preview | null>(null)
const cropState = ref<'idle' | 'loading' | 'missing'>('idle')
const scriptState = ref<'hidden' | 'loading' | 'shown' | 'missing'>('hidden')
const zoom = ref(1)
const rotation = ref(0)
const busy = ref<'verify' | 'retry' | null>(null)
const error = ref('')

let abortController: AbortController | null = null

const evidence = computed(() => props.submission.recognition ?? null)
const summary = computed(() => summarizeRecognition(evidence.value, props.submission.status))
const uncertain = computed(() => uncertainPositions(evidence.value))
const readDigits = computed(() => [...(evidence.value?.raw_candidate ?? '')])
const suggestedStudent = computed(() =>
  props.students.find((s) => s.enrollment === evidence.value?.suggested_enrollment),
)
const canRetry = computed(() => canRetryRecognition(props.submission.status))
const imageTransform = computed(() => `rotate(${rotation.value}deg) scale(${zoom.value})`)

const release = (preview: Preview | null) => {
  if (preview) URL.revokeObjectURL(preview.url)
}

const toPreview = (blob: Blob): Preview => ({
  url: URL.createObjectURL(blob),
  isPdf: blob.type === 'application/pdf',
})

const resetForSubmission = async () => {
  abortController?.abort()
  abortController = new AbortController()
  release(crop.value)
  release(script.value)
  crop.value = null
  script.value = null
  scriptState.value = 'hidden'
  zoom.value = 1
  rotation.value = 0
  error.value = ''
  selected.value = preselectedEnrollment(evidence.value, props.submission.enrollment)

  if (!evidence.value?.region_image_url) {
    cropState.value = 'missing'
    return
  }

  cropState.value = 'loading'
  const signal = abortController.signal
  try {
    const blob = await fetchRecognitionImage(props.submission.id, signal)
    if (signal.aborted) return
    crop.value = toPreview(blob)
    cropState.value = 'idle'
  } catch {
    if (!signal.aborted) cropState.value = 'missing'
  }
}

// The full script can be up to 15 MB, so it is only loaded on request.
const showScript = async () => {
  if (scriptState.value === 'shown' || scriptState.value === 'loading') return
  scriptState.value = 'loading'
  const signal = abortController?.signal
  try {
    const blob = await fetchSubmissionFile(props.submission.id, signal)
    if (signal?.aborted) return
    script.value = toPreview(blob)
    scriptState.value = 'shown'
  } catch {
    if (!signal?.aborted) scriptState.value = 'missing'
  }
}

const describeFailure = (e: unknown, action: string) => {
  const response = (e as { response?: { status?: number; data?: { detail?: string } } }).response
  if (response?.status === 404) return 'This submission no longer exists. Reload the queue.'
  if (response?.status === 400 && response.data?.detail) {
    return `Could not ${action}: ${response.data.detail} It may have been changed in another tab; reload the queue.`
  }
  return `Could not ${action}. Check your connection and try again.`
}

const confirm = async () => {
  if (selected.value === null || busy.value) return
  busy.value = 'verify'
  error.value = ''
  try {
    const verified = await verifySubmission(props.submission.id, selected.value)
    emit('verified', verified)
  } catch (e) {
    error.value = describeFailure(e, 'confirm the student')
  } finally {
    busy.value = null
  }
}

const retry = async () => {
  if (busy.value) return
  busy.value = 'retry'
  error.value = ''
  try {
    emit('retried', await retryRecognition(props.submission.id))
  } catch (e) {
    error.value = describeFailure(e, 'retry recognition')
  } finally {
    busy.value = null
  }
}

const zoomBy = (step: number) => {
  zoom.value = Math.min(4, Math.max(0.5, Math.round((zoom.value + step) * 4) / 4))
}

const rotate = () => {
  rotation.value = (rotation.value + 90) % 360
}

// Shortcuts: Ctrl+Enter confirm, N next, + / - zoom, R rotate, Esc close.
// Letter keys are ignored while typing in a field.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    void confirm()
    return
  }
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

  if (event.key === 'n' && props.hasNext) emit('next')
  else if (event.key === '+' || event.key === '=') zoomBy(0.25)
  else if (event.key === '-') zoomBy(-0.25)
  else if (event.key === 'r') rotate()
}

watch(() => props.submission.id, resetForSubmission, { immediate: true })

onBeforeUnmount(() => {
  abortController?.abort()
  release(crop.value)
  release(script.value)
})
</script>

<template>
  <section
    class="review-panel glass-panel"
    aria-label="Review submission"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <header class="review-header">
      <div>
        <h2>{{ submission.original_filename }}</h2>
        <p class="muted">
          {{ assessmentName ?? `Assessment ${submission.assessment}` }}
          · <StatusBadge :status="submission.status" />
        </p>
      </div>
      <button class="btn-secondary" type="button" @click="emit('close')">Close</button>
    </header>

    <div class="review-body">
      <div class="evidence">
        <p class="headline" data-test="headline">{{ summary.headline }}</p>

        <p v-if="readDigits.length" class="read-number" aria-label="Number as read">
          <span
            v-for="(digit, index) in readDigits"
            :key="index"
            :class="{ uncertain: uncertain.has(index) }"
            >{{ digit }}</span
          >
        </p>

        <ul v-if="summary.details.length" class="details">
          <li v-for="detail in summary.details" :key="detail">{{ detail }}</li>
        </ul>

        <details
          v-if="
            submission.recognition?.method === 'bubble' &&
            submission.recognition.column_scores?.length
          "
        >
          <summary>Bubble column readings</summary>
          <p>Only filled bubbles are read. Written digits above the grid are ignored.</p>
          <table class="bubble-columns">
            <thead>
              <tr>
                <th>Column</th>
                <th>Digit</th>
                <th>Reading</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="column in submission.recognition.column_scores" :key="column.column">
                <td>{{ column.column }}</td>
                <td>{{ column.digit ?? 'Uncertain' }}</td>
                <td>
                  {{
                    column.reason === 'multiple'
                      ? 'Multiple filled bubbles'
                      : column.reason === 'empty'
                        ? 'No filled bubble'
                        : column.reason === 'unreadable'
                          ? 'Uncertain marks'
                          : 'One clear fill'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </details>

        <p v-if="evidence?.raw_text" class="raw-text">
          Text found: <q>{{ evidence.raw_text }}</q>
        </p>

        <label class="field">
          <span>Student on this script</span>
          <select v-model.number="selected" class="glass-input" data-test="student-select">
            <option :value="null" disabled>Select student</option>
            <option
              v-for="student in students"
              :key="student.enrollment"
              :value="student.enrollment"
            >
              {{ student.student_number }} — {{ student.first_name }} {{ student.last_name }}
              <template v-if="student.enrollment === suggestedStudent?.enrollment">
                (suggested)</template
              >
            </option>
          </select>
        </label>
        <p v-if="summary.needsCareful && selected === null" class="hint">
          Check the script and choose the student yourself; this reading is not certain.
        </p>

        <div class="actions">
          <button
            class="btn-primary"
            type="button"
            data-test="confirm"
            :disabled="selected === null || busy !== null"
            @click="confirm"
          >
            {{ busy === 'verify' ? 'Confirming…' : 'Confirm student' }}
          </button>
          <button
            v-if="canRetry"
            class="btn-secondary"
            type="button"
            data-test="retry"
            :disabled="busy !== null"
            @click="retry"
          >
            {{ busy === 'retry' ? 'Retrying…' : 'Retry recognition' }}
          </button>
          <button
            class="btn-secondary"
            type="button"
            :disabled="!hasNext || busy !== null"
            @click="emit('next')"
          >
            Skip to next
          </button>
        </div>

        <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
        <p class="shortcuts muted">
          Ctrl+Enter confirm · N next · + / − zoom · R rotate · Esc close
        </p>
      </div>

      <div class="images">
        <div class="image-tools" role="group" aria-label="Image controls">
          <button class="btn-secondary" type="button" aria-label="Zoom out" @click="zoomBy(-0.25)">
            −
          </button>
          <span class="muted">{{ Math.round(zoom * 100) }}%</span>
          <button class="btn-secondary" type="button" aria-label="Zoom in" @click="zoomBy(0.25)">
            +
          </button>
          <button class="btn-secondary" type="button" @click="rotate">Rotate</button>
        </div>

        <figure class="image-frame">
          <figcaption class="muted">Student-number area</figcaption>
          <p v-if="cropState === 'loading'" class="muted">Loading image…</p>
          <p v-else-if="cropState === 'missing'" class="muted" data-test="crop-missing">
            No image of the number area is available.
          </p>
          <div v-else-if="crop" class="viewport">
            <img
              :src="crop.url"
              alt="Student-number area of the script"
              :style="{ transform: imageTransform }"
            />
          </div>
        </figure>

        <figure class="image-frame">
          <figcaption class="muted">Full script</figcaption>
          <button
            v-if="scriptState === 'hidden'"
            class="btn-secondary"
            type="button"
            data-test="show-script"
            @click="showScript"
          >
            Show full script
          </button>
          <p v-else-if="scriptState === 'loading'" class="muted">Loading script…</p>
          <p v-else-if="scriptState === 'missing'" class="muted" data-test="script-missing">
            The full script can't be shown yet.
          </p>
          <template v-else-if="script">
            <iframe v-if="script.isPdf" :src="script.url" title="Full script" />
            <div v-else class="viewport">
              <img :src="script.url" alt="Full script" :style="{ transform: imageTransform }" />
            </div>
          </template>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bubble-columns {
  width: 100%;
  text-align: left;
}
.bubble-columns th,
.bubble-columns td {
  padding: 0.3rem;
}
.review-panel {
  padding: 1.5rem;
  margin-bottom: 2rem;
  outline: none;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.review-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
  font-family: monospace;
  word-break: break-all;
}

.review-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 1.5rem;
}

.muted {
  color: var(--text-secondary);
  margin: 0;
}

.headline {
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.read-number {
  font-family: monospace;
  font-size: 1.6rem;
  letter-spacing: 0.3em;
  margin: 0 0 0.75rem;
}

.read-number .uncertain {
  color: var(--status-warning);
  text-decoration: underline wavy;
}

.details {
  margin: 0 0 0.75rem;
  padding-left: 1.1rem;
  color: var(--text-secondary);
}

.raw-text {
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.hint {
  color: var(--status-warning);
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.shortcuts {
  font-size: 0.8rem;
}

.image-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.image-frame {
  margin: 0 0 1rem;
  padding: 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-inset);
  overflow: hidden;
}

.viewport {
  margin-top: 0.5rem;
  max-height: 32rem;
  overflow: auto;
}

.image-frame img {
  display: block;
  max-width: 100%;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.image-frame iframe {
  width: 100%;
  height: 32rem;
  border: none;
  margin-top: 0.5rem;
  background: #fff;
}

@media (max-width: 900px) {
  .review-body {
    grid-template-columns: 1fr;
  }
}
</style>
