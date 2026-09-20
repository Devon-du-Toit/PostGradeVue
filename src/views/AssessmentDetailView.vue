<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchAssessment } from '@/services/assessments'
import { fetchCourseGradebook } from '@/services/gradebook'
import {
  createAssessmentResult,
  fetchAssessmentResults,
  updateAssessmentResult,
} from '@/services/results'
import {
  fetchSubmissions,
  markSubmission,
  uploadSubmission,
  verifySubmission,
} from '@/services/submissions'
import type { Assessment } from '@/types/assessment'
import type { GradebookStudent } from '@/types/gradebook'
import type { Result } from '@/types/result'
import type { Submission, SubmissionStatus } from '@/types/submission'

const route = useRoute()
const assessmentId = Number(route.params.id)

const assessment = ref<Assessment | null>(null)
const students = ref<GradebookStudent[]>([])
const results = ref<Result[]>([])
const submissions = ref<Submission[]>([])
const loading = ref(true)
const savingEnrollment = ref<number | null>(null)
const uploading = ref(false)
const verifyingSubmissionId = ref<number | null>(null)
const markingSubmissionId = ref<number | null>(null)
const selectedSubmissionFile = ref<File | null>(null)
const error = ref('')
const successMessage = ref('')

const marks = reactive<Record<number, number | null>>({})
const verificationSelections = reactive<Record<number, number | null>>({})
const submissionMarks = reactive<Record<number, number | null>>({})

const resultByEnrollment = computed(() => {
  return new Map(results.value.map((result) => [result.enrollment, result]))
})

const studentByEnrollment = computed(() => {
  return new Map(students.value.map((student) => [student.enrollment, student]))
})

const statusLabel = (status: SubmissionStatus) => {
  const labels: Record<SubmissionStatus, string> = {
    uploaded: 'Uploaded',
    matched: 'Matched',
    needs_verification: 'Needs verification',
    verified: 'Verified',
    marked: 'Marked',
  }

  return labels[status]
}

const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const assessmentData = await fetchAssessment(assessmentId)
    assessment.value = assessmentData

    const [gradebookData, resultData, submissionData] = await Promise.all([
      fetchCourseGradebook(assessmentData.course),
      fetchAssessmentResults(assessmentId),
      fetchSubmissions(),
    ])

    students.value = gradebookData.students
    results.value = resultData
    submissions.value = submissionData.filter(
      (submission) => submission.assessment === assessmentId,
    )

    for (const student of students.value) {
      const existing = resultData.find(
        (result) => result.enrollment === student.enrollment,
      )
      marks[student.enrollment] = existing ? Number(existing.mark) : null
    }

    for (const submission of submissions.value) {
      verificationSelections[submission.id] = submission.enrollment

      const existingResult = submission.enrollment
        ? resultData.find((result) => result.enrollment === submission.enrollment)
        : undefined

      submissionMarks[submission.id] = existingResult
        ? Number(existingResult.mark)
        : null
    }
  } catch {
    error.value = 'Could not load assessment data.'
  } finally {
    loading.value = false
  }
}

const saveMark = async (student: GradebookStudent) => {
  const mark = marks[student.enrollment]

  if (typeof mark !== 'number' || Number.isNaN(mark)) {
    error.value = 'Enter a mark before saving.'
    return
  }

  if (assessment.value && (mark < 0 || mark > Number(assessment.value.max_mark))) {
    error.value = `Mark must be between 0 and ${assessment.value.max_mark}.`
    return
  }

  savingEnrollment.value = student.enrollment
  error.value = ''
  successMessage.value = ''

  try {
    const existing = resultByEnrollment.value.get(student.enrollment)

    const saved = existing
      ? await updateAssessmentResult(existing.id, { mark })
      : await createAssessmentResult(assessmentId, {
          enrollment: student.enrollment,
          mark,
        })

    const index = results.value.findIndex((result) => result.id === saved.id)

    if (index >= 0) {
      results.value[index] = saved
    } else {
      results.value.push(saved)
    }

    marks[student.enrollment] = Number(saved.mark)
    successMessage.value = `Saved mark for ${student.first_name} ${student.last_name}.`
  } catch {
    error.value = 'Could not save mark. Check the value and try again.'
  } finally {
    savingEnrollment.value = null
  }
}

const handleSubmissionFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedSubmissionFile.value = input.files?.[0] ?? null
  error.value = ''
  successMessage.value = ''
}

const submitSubmission = async () => {
  if (!selectedSubmissionFile.value) {
    error.value = 'Choose a submission file first.'
    return
  }

  uploading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const submission = await uploadSubmission(
      assessmentId,
      selectedSubmissionFile.value,
    )

    submissions.value.push(submission)
    verificationSelections[submission.id] = submission.enrollment
    submissionMarks[submission.id] = null
    selectedSubmissionFile.value = null
    successMessage.value = `Uploaded ${submission.original_filename}.`
  } catch {
    error.value = 'Could not upload submission.'
  } finally {
    uploading.value = false
  }
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

    const existingResult = verified.enrollment
      ? resultByEnrollment.value.get(verified.enrollment)
      : undefined
    submissionMarks[verified.id] = existingResult
      ? Number(existingResult.mark)
      : null

    successMessage.value = `Verified ${verified.original_filename}.`
  } catch {
    error.value = 'Could not verify submission for that student.'
  } finally {
    verifyingSubmissionId.value = null
  }
}

const saveSubmissionMark = async (submission: Submission) => {
  const mark = submissionMarks[submission.id]

  if (typeof mark !== 'number' || Number.isNaN(mark)) {
    error.value = 'Enter a mark before marking the submission.'
    return
  }

  if (assessment.value && (mark < 0 || mark > Number(assessment.value.max_mark))) {
    error.value = `Mark must be between 0 and ${assessment.value.max_mark}.`
    return
  }

  markingSubmissionId.value = submission.id
  error.value = ''
  successMessage.value = ''

  try {
    const savedResult = await markSubmission(submission.id, mark)

    const resultIndex = results.value.findIndex((result) => result.id === savedResult.id)
    if (resultIndex >= 0) {
      results.value[resultIndex] = savedResult
    } else {
      results.value.push(savedResult)
    }

    marks[savedResult.enrollment] = Number(savedResult.mark)
    submissionMarks[submission.id] = Number(savedResult.mark)

    const existingSubmission = submissions.value.find((item) => item.id === submission.id)
    if (existingSubmission) {
      existingSubmission.status = 'marked'
    }

    successMessage.value = `Marked ${submission.original_filename}: ${savedResult.mark}/${assessment.value?.max_mark}.`
  } catch {
    error.value = 'Could not mark submission. It must be verified first and the mark must be valid.'
  } finally {
    markingSubmissionId.value = null
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <main class="assessment-detail-page">
    <p v-if="loading" class="status-text loading-text">Loading assessment…</p>
    <p v-else-if="error && !assessment" class="error-box">{{ error }}</p>

    <template v-else-if="assessment">
      <RouterLink class="back-link" :to="`/courses/${assessment.course}`">← Back to course</RouterLink>

      <header class="page-header">
        <h1>{{ assessment.name }}</h1>
        <p class="assessment-date">{{ assessment.date }}</p>
      </header>

      <!-- Glassy stats panel -->
      <section class="panel glass-panel stats-panel">
        <dl class="stats-grid">
          <div class="stat-item">
            <dt>Maximum mark</dt>
            <dd>{{ assessment.max_mark }}</dd>
          </div>
          <div class="stat-item">
            <dt>Course weight</dt>
            <dd>{{ assessment.weight }}%</dd>
          </div>
        </dl>
      </section>

      <!-- Submissions Panel -->
      <section class="panel glass-panel">
        <h2>Submissions</h2>
        <p class="section-desc">
          Upload a scanned submission. PostGrade will run recognition automatically and
          either suggest a student match or place the file into verification.
        </p>

        <div class="upload-controls">
          <input
            class="file-input"
            type="file"
            accept=".pdf,image/*"
            @change="handleSubmissionFileChange"
          />
          <button
            class="btn-primary"
            type="button"
            :disabled="uploading || !selectedSubmissionFile"
            @click="submitSubmission"
          >
            {{ uploading ? 'Uploading and recognizing…' : 'Upload submission' }}
          </button>
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
                <th>Verification / mark</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="submission in submissions" :key="submission.id">
                <td class="filename-cell">{{ submission.original_filename }}</td>
                <td>
                  <span class="status-badge" :data-status="submission.status">
                    {{ statusLabel(submission.status) }}
                  </span>
                </td>
                <td>
                  <template v-if="submission.enrollment">
                    <span class="student-number">{{ studentByEnrollment.get(submission.enrollment)?.student_number ?? 'Unknown' }}</span>
                    <span v-if="studentByEnrollment.get(submission.enrollment)" class="student-name">
                      — {{ studentByEnrollment.get(submission.enrollment)?.first_name }}
                      {{ studentByEnrollment.get(submission.enrollment)?.last_name }}
                    </span>
                  </template>
                  <span v-else class="status-text warning-text">Not matched</span>
                </td>
                <td>
                  <template v-if="submission.status === 'matched' || submission.status === 'needs_verification'">
                    <div class="verification-controls">
                      <select class="glass-input" v-model.number="verificationSelections[submission.id]">
                        <option :value="null" disabled>Select student</option>
                        <option
                          v-for="student in students"
                          :key="student.enrollment"
                          :value="student.enrollment"
                        >
                          {{ student.student_number }} — {{ student.first_name }} {{ student.last_name }}
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
                    <div class="marking-controls">
                      <input
                        class="glass-input mark-input"
                        v-model.number="submissionMarks[submission.id]"
                        type="number"
                        min="0"
                        :max="Number(assessment.max_mark)"
                        step="0.01"
                        placeholder="Mark"
                      />
                      <span class="max-mark-text">/ {{ assessment.max_mark }}</span>
                      <button
                        class="btn-primary"
                        type="button"
                        :disabled="markingSubmissionId === submission.id"
                        @click="saveSubmissionMark(submission)"
                      >
                        {{ markingSubmissionId === submission.id ? 'Marking…' : 'Save mark' }}
                      </button>
                    </div>
                  </template>

                  <template v-else-if="submission.status === 'marked'">
                    <span class="marked-text">
                      <template v-if="submission.enrollment && resultByEnrollment.get(submission.enrollment)">
                        <strong>{{ resultByEnrollment.get(submission.enrollment)?.mark }}</strong> / {{ assessment.max_mark }}
                        <small class="percentage-muted">({{ Number(resultByEnrollment.get(submission.enrollment)?.percentage).toFixed(2) }}%)</small>
                      </template>
                    </span>
                  </template>

                  <span v-else class="status-text">Complete</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Results Panel -->
      <section class="panel glass-panel">
        <h2>Results</h2>
        <p v-if="students.length === 0" class="status-text">No students are enrolled in this course.</p>

        <div v-else class="table-wrap results-wrap">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Student number</th>
                <th>Name</th>
                <th>Mark</th>
                <th>Percentage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.enrollment">
                <td class="student-number">{{ student.student_number }}</td>
                <td class="student-name">{{ student.first_name }} {{ student.last_name }}</td>
                <td>
                  <div class="marking-controls">
                    <input
                      class="glass-input mark-input"
                      v-model.number="marks[student.enrollment]"
                      type="number"
                      min="0"
                      :max="Number(assessment.max_mark)"
                      step="0.01"
                    />
                    <span class="max-mark-text">/ {{ assessment.max_mark }}</span>
                  </div>
                </td>
                <td class="percentage-cell">
                  {{
                    resultByEnrollment.get(student.enrollment)
                      ? `${Number(resultByEnrollment.get(student.enrollment)?.percentage).toFixed(2)}%`
                      : '—'
                  }}
                </td>
                <td>
                  <button
                    class="btn-primary"
                    type="button"
                    :disabled="savingEnrollment === student.enrollment"
                    @click="saveMark(student)"
                  >
                    {{ savingEnrollment === student.enrollment ? 'Saving…' : 'Save' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p v-if="successMessage" class="success-box">{{ successMessage }}</p>
      <p v-if="error" class="error-box">{{ error }}</p>
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
  transition: color 0.2s ease, transform 0.2s ease;
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
  background: rgba(0,0,0,0.2);
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
  background: rgba(0, 0, 0, 0.25);
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

.verification-controls,
.marking-controls {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: center;
}

.mark-input {
  width: 90px;
  text-align: center;
}

.max-mark-text {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Data Tables */
.table-wrap {
  margin-top: 1rem;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
}

.glass-table {
  width: 100%;
  border-collapse: collapse;
}

.glass-table th {
  padding: 1rem;
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  color: var(--accent-green);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.glass-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.glass-table tr:last-child td {
  border-bottom: none;
}

.glass-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
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
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem top 50%;
  background-size: 0.65rem auto;
  padding-right: 1.5rem;
  min-width: 180px;
}
select.glass-input option {
  background: #151f32;
  color: var(--text-primary);
}

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.status-badge[data-status="uploaded"] { background: rgba(255,255,255,0.1); color: var(--text-secondary); }
.status-badge[data-status="matched"] { background: rgba(34,211,238,0.15); color: #22d3ee; }
.status-badge[data-status="needs_verification"] { background: rgba(245,158,11,0.15); color: var(--status-warning); }
.status-badge[data-status="verified"] { background: rgba(168,85,247,0.15); color: #a855f7; }
.status-badge[data-status="marked"] { background: rgba(91,166,91,0.15); color: var(--accent-green); }

.percentage-muted {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.percentage-cell {
  font-weight: 600;
  color: var(--accent-green) !important;
}

.marked-text {
  color: var(--text-primary);
}
.marked-text strong {
  color: var(--accent-green);
  font-size: 1.1rem;
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

.error-box {
  margin-top: 1.25rem;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--status-error);
  padding: 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.success-box {
  margin-top: 1.25rem;
  color: #86efac;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid var(--status-success);
  padding: 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}
</style>
