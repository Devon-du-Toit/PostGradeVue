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
import type { Assessment } from '@/types/assessment'
import type { GradebookStudent } from '@/types/gradebook'
import type { Result } from '@/types/result'

const route = useRoute()
const assessmentId = Number(route.params.id)

const assessment = ref<Assessment | null>(null)
const students = ref<GradebookStudent[]>([])
const results = ref<Result[]>([])
const loading = ref(true)
const savingEnrollment = ref<number | null>(null)
const error = ref('')
const successMessage = ref('')

const marks = reactive<Record<number, number | null>>({})

const resultByEnrollment = computed(() => {
  return new Map(results.value.map((result) => [result.enrollment, result]))
})

const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const assessmentData = await fetchAssessment(assessmentId)
    assessment.value = assessmentData

    const [gradebookData, resultData] = await Promise.all([
      fetchCourseGradebook(assessmentData.course),
      fetchAssessmentResults(assessmentId),
    ])

    students.value = gradebookData.students
    results.value = resultData

    for (const student of students.value) {
      const existing = resultData.find(
        (result) => result.enrollment === student.enrollment,
      )
      marks[student.enrollment] = existing ? Number(existing.mark) : null
    }
  } catch {
    error.value = 'Could not load assessment results.'
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

        <p v-if="successMessage" class="success">{{ successMessage }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.assessment-detail-page {
  max-width: 960px;
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

.results-table-wrap {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.results-table input {
  width: 7rem;
  padding: 0.5rem;
  font: inherit;
}

button {
  padding: 0.55rem 0.85rem;
  font: inherit;
  cursor: pointer;
}

.error {
  color: #b00020;
}

.success {
  color: #1b5e20;
}
</style>
