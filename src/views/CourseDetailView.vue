<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { createAssessment, fetchCourseAssessments } from '@/services/assessments'
import { fetchCourse } from '@/services/courses'
import { fetchCourseStudents, importCourseStudents } from '@/services/students'
import type { Assessment } from '@/types/assessment'
import type { Course } from '@/types/course'
import type { Student } from '@/types/student'

const route = useRoute()
const courseId = Number(route.params.id)

const course = ref<Course | null>(null)
const students = ref<Student[]>([])
const assessments = ref<Assessment[]>([])
const loading = ref(true)
const importing = ref(false)
const creatingAssessment = ref(false)
const error = ref('')
const importMessage = ref('')
const selectedFile = ref<File | null>(null)

const assessmentForm = reactive({
  name: '',
  max_mark: 100,
  weight: 10,
  date: new Date().toISOString().slice(0, 10),
})

const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const [courseData, studentData, assessmentData] = await Promise.all([
      fetchCourse(courseId),
      fetchCourseStudents(courseId),
      fetchCourseAssessments(courseId),
    ])

    course.value = courseData
    students.value = studentData
    assessments.value = assessmentData
  } catch {
    error.value = 'Could not load course details.'
  } finally {
    loading.value = false
  }
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  importMessage.value = ''
}

const importStudents = async () => {
  if (!selectedFile.value) {
    error.value = 'Choose a CSV file first.'
    return
  }

  importing.value = true
  error.value = ''
  importMessage.value = ''

  try {
    const response = await importCourseStudents(courseId, selectedFile.value)
    importMessage.value = response.message
    students.value = await fetchCourseStudents(courseId)
    selectedFile.value = null
  } catch {
    error.value = 'Could not import students. Check the CSV columns and values.'
  } finally {
    importing.value = false
  }
}

const submitAssessment = async () => {
  creatingAssessment.value = true
  error.value = ''

  try {
    const assessment = await createAssessment(courseId, { ...assessmentForm })
    assessments.value.push(assessment)
    assessmentForm.name = ''
    assessmentForm.max_mark = 100
    assessmentForm.weight = 10
  } catch {
    error.value = 'Could not create assessment. Check the values and try again.'
  } finally {
    creatingAssessment.value = false
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <main class="course-detail-page">
    <RouterLink to="/courses">← Back to courses</RouterLink>

    <p v-if="loading">Loading course…</p>
    <p v-else-if="error && !course" class="error">{{ error }}</p>

    <template v-else-if="course">
      <header class="course-header">
        <div>
          <p class="course-code">{{ course.code }}</p>
          <h1>{{ course.name }}</h1>
        </div>
        <p>{{ course.year }} · Semester {{ course.semester }}</p>
      </header>

      <section class="panel">
        <h2>Assessments</h2>

        <form class="assessment-form" @submit.prevent="submitAssessment">
          <label>
            Name
            <input v-model.trim="assessmentForm.name" required placeholder="Test 1" />
          </label>

          <label>
            Maximum mark
            <input v-model.number="assessmentForm.max_mark" type="number" min="1" step="0.01" required />
          </label>

          <label>
            Weight (%)
            <input v-model.number="assessmentForm.weight" type="number" min="0" max="100" step="0.01" required />
          </label>

          <label>
            Date
            <input v-model="assessmentForm.date" type="date" required />
          </label>

          <button type="submit" :disabled="creatingAssessment">
            {{ creatingAssessment ? 'Creating…' : 'Create assessment' }}
          </button>
        </form>

        <p v-if="assessments.length === 0" class="empty-state">No assessments yet.</p>

        <ul v-else class="assessment-list">
          <li v-for="assessment in assessments" :key="assessment.id">
            <RouterLink :to="`/assessments/${assessment.id}`">
              <strong>{{ assessment.name }}</strong>
              <span>{{ assessment.date }}</span>
              <span>{{ assessment.max_mark }} marks · {{ assessment.weight }}%</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>Import students</h2>
        <p>
          Upload a CSV with the columns
          <code>student_number</code>, <code>first_name</code>,
          <code>last_name</code>, and <code>email</code>.
        </p>

        <div class="import-controls">
          <input type="file" accept=".csv,text/csv" @change="handleFileChange" />
          <button type="button" :disabled="importing || !selectedFile" @click="importStudents">
            {{ importing ? 'Importing…' : 'Import CSV' }}
          </button>
        </div>

        <p v-if="importMessage" class="success">{{ importMessage }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </section>

      <section class="panel">
        <h2>Students</h2>

        <p v-if="students.length === 0">No students enrolled yet.</p>

        <div v-else class="student-table-wrap">
          <table class="student-table">
            <thead>
              <tr>
                <th>Student number</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.id">
                <td>{{ student.student_number }}</td>
                <td>{{ student.first_name }} {{ student.last_name }}</td>
                <td>{{ student.email }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.course-detail-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.course-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-top: 1.5rem;
}

.course-code {
  margin-bottom: 0.25rem;
  font-weight: 700;
}

.course-header h1 {
  margin-top: 0;
}

.panel {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
}

.assessment-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  align-items: end;
}

.assessment-form label {
  display: grid;
  gap: 0.4rem;
}

.assessment-form input,
.assessment-form button {
  font: inherit;
  padding: 0.65rem 0.75rem;
}

.assessment-list {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  margin-top: 1.5rem;
  list-style: none;
}

.assessment-list a {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) 1fr 1fr;
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid #eee;
  color: inherit;
  text-decoration: none;
}

.assessment-list a:hover strong {
  text-decoration: underline;
}

.import-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

button,
input {
  font: inherit;
}

button {
  padding: 0.65rem 1rem;
  cursor: pointer;
}

.student-table-wrap {
  overflow-x: auto;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
}

.student-table th,
.student-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.empty-state {
  margin-top: 1.5rem;
}

.error {
  color: #b00020;
}

.success {
  color: #1b5e20;
}
</style>
