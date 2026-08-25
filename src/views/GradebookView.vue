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
    <RouterLink :to="`/courses/${courseId}`">← Back to course</RouterLink>

    <p v-if="loading">Loading gradebook…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="course && gradebook">
      <header class="gradebook-header">
        <div>
          <p class="course-code">{{ course.code }}</p>
          <h1>{{ course.name }} Gradebook</h1>
        </div>
      </header>

      <section class="panel">
        <p v-if="gradebook.students.length === 0">No enrolled students yet.</p>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student number</th>
                <th v-for="assessment in assessments" :key="assessment.assessment">
                  {{ assessment.name }}
                </th>
                <th>Course %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in gradebook.students" :key="student.enrollment">
                <td>{{ student.first_name }} {{ student.last_name }}</td>
                <td>{{ student.student_number }}</td>
                <td v-for="assessment in student.assessments" :key="assessment.assessment">
                  <span v-if="assessment.mark !== null">
                    {{ formatNumber(assessment.mark) }} / {{ formatNumber(assessment.max_mark) }}
                    <small>({{ formatNumber(assessment.percentage, '%') }})</small>
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.gradebook-header {
  margin-top: 1.5rem;
}

.course-code {
  margin-bottom: 0.25rem;
  font-weight: 700;
}

.gradebook-header h1 {
  margin-top: 0;
}

.panel {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
  white-space: nowrap;
}

small {
  display: block;
  margin-top: 0.2rem;
}

.error {
  color: #b00020;
}
</style>
