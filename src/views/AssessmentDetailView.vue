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
const selectedSubmissionFile = ref<File | null>(null)
const error = ref('')
const successMessage = ref('')

const marks = reactive<Record<number, number | null>>({})
const verificationSelections = reactive<Record<number, number | null>>({})

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
    successMessage.value = `Verified ${verified.original_filename}.`
  } catch {
    error.value = 'Could not verify submission for that student.'
  } finally {
    verifyingSubmissionId.value = null
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <main class="assessment-detail-page">
    <p v-if="loading">Loading assessment…</p>
    <p v-else-if="error && !assessment" class="error">{{ error }}</p>

    <template v-else-if="assessment">
      <RouterLink :to="`/courses/${assessment.course}`">← Back to course</RouterLink>

      <header>
        <h1>{{ assessment.name }}</h1>
        <p>{{ assessment.date }}</p>
      </header>

      <section class="panel">
        <dl>
          <div>
            <dt>Maximum mark</dt>
            <dd>{{ assessment.max_mark }}</dd>
          </div>
          <div>
            <dt>Course weight</dt>
            <dd>{{ assessment.weight }}%</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <h2>Submissions</h2>
        <p>
          Upload a scanned submission. PostGrade will run recognition automatically and
          either suggest a student match or place the file into verification.
        </p>

        <div class="upload-controls">
          <input
            type="file"
            accept=".pdf,image/*"
            @change="handleSubmissionFileChange"
          />
          <button
            type="button"
            :disabled="uploading || !selectedSubmissionFile"
            @click="submitSubmission"
          >
            {{ uploading ? 'Uploading and recognizing…' : 'Upload submission' }}
          </button>
        </div>

        <p v-if="submissions.length === 0" class="empty-state">
          No submissions uploaded for this assessment yet.
        </p>

        <div v-else class="submissions-table-wrap">
          <table class="submissions-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Student</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="submission in submissions" :key="submission.id">
                <td>{{ submission.original_filename }}</td>
                <td>{{ statusLabel(submission.status) }}</td>
                <td>
                  <template v-if="submission.enrollment">
                    {{ studentByEnrollment.get(submission.enrollment)?.student_number ?? 'Unknown' }}
                    <span v-if="studentByEnrollment.get(submission.enrollment)">
                      — {{ studentByEnrollment.get(submission.enrollment)?.first_name }}
                      {{ studentByEnrollment.get(submission.enrollment)?.last_name }}
                    </span>
                  </template>
                  <span v-else>Not matched</span>
                </td>
                <td>
                  <template v-if="submission.status === 'matched' || submission.status === 'needs_verification'">
                    <div class="verification-controls">
                      <select v-model.number="verificationSelections[submission.id]">
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
                  <span v-else>Complete</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Results</h2>

        <p v-if="students.length === 0">No students are enrolled in this course.</p>

        <div v-else class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Student number</th>
                <th>Name</th>
                <th>Mark</th>
                <th>Percentage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.enrollment">
                <td>{{ student.student_number }}</td>
                <td>{{ student.first_name }} {{ student.last_name }}</td>
                <td>
                  <input
                    v-model.number="marks[student.enrollment]"
                    type="number"
                    min="0"
                    :max="Number(assessment.max_mark)"
                    step="0.01"
                  />
                  / {{ assessment.max_mark }}
                </td>
                <td>
                  {{
                    resultByEnrollment.get(student.enrollment)
                      ? `${Number(resultByEnrollment.get(student.enrollment)?.percentage).toFixed(2)}%`
                      : '—'
                  }}
                </td>
                <td>
                  <button
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

      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </template>
  </main>
</template>

<style scoped>
.assessment-detail-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

header {
  margin-top: 1.5rem;
}

.panel {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
}

dl {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

dt {
  font-weight: 700;
}

dd {
  margin: 0.25rem 0 0;
}

.upload-controls,
.verification-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.submissions-table-wrap,
.results-table-wrap {
  margin-top: 1rem;
  overflow-x: auto;
}

.submissions-table,
.results-table {
  width: 100%;
  border-collapse: collapse;
}

.submissions-table th,
.submissions-table td,
.results-table th,
.results-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: middle;
}

.results-table input {
  width: 7rem;
}

input,
select,
button {
  padding: 0.55rem 0.75rem;
  font: inherit;
}

button {
  cursor: pointer;
}

.empty-state {
  margin-top: 1rem;
}

.error {
  color: #b00020;
}

.success {
  color: #1b5e20;
}
</style>
