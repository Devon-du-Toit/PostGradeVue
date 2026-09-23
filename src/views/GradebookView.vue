<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchCourse } from '@/services/courses'
import { fetchCourseGradebook } from '@/services/gradebook'
import type { Course } from '@/types/course'
import type { Gradebook } from '@/types/gradebook'

const route = useRoute()
const courseId = Number(route.params.id)

const course = ref<Course | null>(null)
const gradebook = ref<Gradebook | null>(null)
const loading = ref(true)
const error = ref('')

const assessments = computed(() => gradebook.value?.students[0]?.assessments ?? [])

const formatNumber = (value: number | string | null, suffix = '') => {
  if (value === null) {
    return '—'
  }

  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return String(value)
  }

  return `${numericValue.toFixed(2)}${suffix}`
}

const loadGradebook = async () => {
  loading.value = true
  error.value = ''

  try {
    const [courseData, gradebookData] = await Promise.all([
      fetchCourse(courseId),
      fetchCourseGradebook(courseId),
    ])

    course.value = courseData
    gradebook.value = gradebookData
  } catch {
    error.value = 'Could not load gradebook.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadGradebook()
})
</script>

<template>
  <main class="gradebook-page">
    <RouterLink class="back-link" :to="`/courses/${courseId}`">← Back to course</RouterLink>

    <p v-if="loading" class="status-text loading-text">Loading gradebook…</p>
    <p v-else-if="error" class="error-box">{{ error }}</p>

    <template v-else-if="course && gradebook">
      <header class="gradebook-header">
        <div>
          <p class="course-code">{{ course.code }}</p>
          <h1>{{ course.name }} Gradebook</h1>
        </div>
      </header>

      <!-- Applied glass-panel -->
      <section class="panel glass-panel">
        <p v-if="gradebook.students.length === 0" class="status-text empty-state">
          No enrolled students yet.
        </p>

        <div v-else class="gradebook-table-wrap">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student number</th>
                <th v-for="assessment in assessments" :key="assessment.assessment">
                  {{ assessment.name }}
                </th>
                <th class="highlight-header">Course %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in gradebook.students" :key="student.enrollment">
                <td class="student-name">{{ student.first_name }} {{ student.last_name }}</td>
                <td class="student-number">{{ student.student_number }}</td>
                <td v-for="assessment in student.assessments" :key="assessment.assessment">
                  <span v-if="assessment.mark !== null" class="mark-cell">
                    {{ formatNumber(assessment.mark) }} / <span class="max-mark">{{ formatNumber(assessment.max_mark) }}</span>
                    <small class="percentage-muted">({{ formatNumber(assessment.percentage, '%') }})</small>
                  </span>
                  <span v-else class="status-text">—</span>
                </td>
                <td class="final-grade">
                  <strong>{{ formatNumber(student.course_percentage, '%') }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.gradebook-page {
  max-width: 1300px; /* Widened to accommodate multiple assessment columns */
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

.gradebook-header {
  margin-bottom: 2.5rem;
}

.course-code {
  margin-bottom: 0.5rem;
  color: var(--accent-green);
  font-weight: 700;
  letter-spacing: 0.05em;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.gradebook-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 2.2rem;
  line-height: 1.1;
}

.panel {
  padding: 2rem;
}

/* Data Table Styling */
.gradebook-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
}

.gradebook-table {
  width: 100%;
  border-collapse: collapse;
}

.gradebook-table th {
  padding: 1rem;
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  white-space: nowrap;
}

.highlight-header {
  color: var(--accent-green) !important;
}

.gradebook-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: 0.95rem;
  white-space: nowrap;
}

.gradebook-table tr:last-child td {
  border-bottom: none;
}

.gradebook-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.student-name {
  font-weight: 500;
}

.student-number {
  font-family: monospace;
  color: var(--text-secondary) !important;
}

.mark-cell {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.max-mark {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.percentage-muted {
  display: inline-block;
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-left: 0.2rem;
}

.final-grade {
  color: var(--accent-green) !important;
  font-size: 1.05rem !important;
}

.status-text {
  color: var(--text-muted);
  font-style: italic;
}

.loading-text {
  font-size: 1.1rem;
  margin-top: 2rem;
}

.empty-state {
  margin-top: 0;
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
</style>
