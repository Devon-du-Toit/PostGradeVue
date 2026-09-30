<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { fetchAssessment } from '@/services/assessments'
import { fetchCourseGradebook } from '@/services/gradebook'
import { fetchVerificationQueue, verifySubmission } from '@/services/submissions'
import type { Assessment } from '@/types/assessment'
import type { GradebookStudent } from '@/types/gradebook'
import type { Submission } from '@/types/submission'

const submissions = ref<Submission[]>([])
const assessments = reactive<Record<number, Assessment>>({})
const studentsByAssessment = reactive<Record<number, GradebookStudent[]>>({})
const selections = reactive<Record<number, number | null>>({})
const loading = ref(true)
const verifyingId = ref<number | null>(null)
const error = ref('')
const successMessage = ref('')

const loadQueue = async () => {
  loading.value = true
  error.value = ''

  try {
    const queue = await fetchVerificationQueue()
    submissions.value = queue

    const assessmentIds = [...new Set(queue.map((submission) => submission.assessment))]

    await Promise.all(
      assessmentIds.map(async (assessmentId) => {
        const assessment = await fetchAssessment(assessmentId)
        assessments[assessmentId] = assessment

        const gradebook = await fetchCourseGradebook(assessment.course)
        studentsByAssessment[assessmentId] = gradebook.students
      }),
    )

    for (const submission of queue) {
      selections[submission.id] = submission.enrollment
    }
  } catch {
    error.value = 'Could not load the verification queue.'
  } finally {
    loading.value = false
  }
}

const verify = async (submission: Submission) => {
  const enrollment = selections[submission.id]

  if (typeof enrollment !== 'number') {
    error.value = 'Select a student before verifying the submission.'
    return
  }

  verifyingId.value = submission.id
  error.value = ''
  successMessage.value = ''

  try {
    const verified = await verifySubmission(submission.id, enrollment)
    submissions.value = submissions.value.filter((item) => item.id !== verified.id)
    successMessage.value = `Verified ${verified.original_filename}.`
  } catch {
    error.value = 'Could not verify that submission for the selected student.'
  } finally {
    verifyingId.value = null
  }
}

const studentsFor = (submission: Submission) => {
  return studentsByAssessment[submission.assessment] ?? []
}

const matchedStudent = (submission: Submission) => {
  if (!submission.enrollment) return null
  return studentsFor(submission).find(
    (student) => student.enrollment === submission.enrollment,
  ) ?? null
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
      <p>Review OCR matches that still need lecturer confirmation.</p>
    </header>

    <p v-if="loading" class="status-text loading-text">Loading verification queue…</p>
    <p v-else-if="error && submissions.length === 0" class="error-box">{{ error }}</p>

    <!-- Applied glass-panel -->
    <section v-else class="panel glass-panel">
      <p v-if="submissions.length === 0" class="empty-state status-text">
        No submissions need verification.
      </p>

      <div v-else class="queue-table-wrap">
        <table class="queue-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Assessment</th>
              <th>OCR suggestion</th>
              <th>Confirm student</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="submission in submissions" :key="submission.id">
              <td class="filename-cell">{{ submission.original_filename }}</td>
              <td>
                <RouterLink class="assessment-link" :to="`/assessments/${submission.assessment}`">
                  {{ assessments[submission.assessment]?.name ?? `Assessment ${submission.assessment}` }}
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
                  <!-- Applied glass-input and custom dropdown styling -->
                  <select class="glass-input" v-model.number="selections[submission.id]">
                    <option :value="null" disabled>Select student</option>
                    <option
                      v-for="student in studentsFor(submission)"
                      :key="student.enrollment"
                      :value="student.enrollment"
                    >
                      {{ student.student_number }} — {{ student.first_name }} {{ student.last_name }}
                    </option>
                  </select>

                  <!-- Applied btn-primary -->
                  <button
                    class="btn-primary"
                    type="button"
                    :disabled="verifyingId === submission.id"
                    @click="verify(submission)"
                  >
                    {{ verifyingId === submission.id ? 'Verifying…' : 'Verify' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="successMessage" class="success-box">{{ successMessage }}</p>
    <p v-if="error && submissions.length > 0" class="error-box">{{ error }}</p>
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
  background: rgba(0, 0, 0, 0.15);
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
}

.queue-table th {
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

.queue-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.queue-table tr:last-child td {
  border-bottom: none;
}

.queue-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
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

.verification-controls {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: center;
}

/* Custom dropdown arrow for table inputs */
select.glass-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem top 50%;
  background-size: 0.65rem auto;
  padding-right: 1.5rem;
  min-width: 200px;
}

select.glass-input option {
  background: #151f32;
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
