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
    <RouterLink to="/dashboard">← Back to dashboard</RouterLink>

    <header>
      <h1>Verification queue</h1>
      <p>Review OCR matches that still need lecturer confirmation.</p>
    </header>

    <p v-if="loading">Loading verification queue…</p>
    <p v-else-if="error && submissions.length === 0" class="error">{{ error }}</p>

    <section v-else class="panel">
      <p v-if="submissions.length === 0" class="empty-state">
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
              <td>{{ submission.original_filename }}</td>
              <td>
                <RouterLink :to="`/assessments/${submission.assessment}`">
                  {{ assessments[submission.assessment]?.name ?? `Assessment ${submission.assessment}` }}
                </RouterLink>
              </td>
              <td>
                <template v-if="matchedStudent(submission)">
                  {{ matchedStudent(submission)?.student_number }} —
                  {{ matchedStudent(submission)?.first_name }}
                  {{ matchedStudent(submission)?.last_name }}
                </template>
                <span v-else>No confident match</span>
              </td>
              <td>
                <div class="verification-controls">
                  <select v-model.number="selections[submission.id]">
                    <option :value="null" disabled>Select student</option>
                    <option
                      v-for="student in studentsFor(submission)"
                      :key="student.enrollment"
                      :value="student.enrollment"
                    >
                      {{ student.student_number }} — {{ student.first_name }} {{ student.last_name }}
                    </option>
                  </select>
                  <button
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

    <p v-if="successMessage" class="success">{{ successMessage }}</p>
    <p v-if="error && submissions.length > 0" class="error">{{ error }}</p>
  </main>
</template>

<style scoped>
.queue-page {
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

.queue-table-wrap {
  overflow-x: auto;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
}

.queue-table th,
.queue-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: middle;
}

.verification-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

select,
button {
  padding: 0.55rem 0.75rem;
  font: inherit;
}

button {
  cursor: pointer;
}

.error {
  color: #b00020;
}

.success {
  color: #1b5e20;
}
</style>
