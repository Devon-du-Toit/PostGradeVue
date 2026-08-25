<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchCourse } from '@/services/courses'
import { fetchCourseStudents, importCourseStudents } from '@/services/students'
import type { Course } from '@/types/course'
import type { Student } from '@/types/student'

const route = useRoute()
const courseId = Number(route.params.id)

const course = ref<Course | null>(null)
const students = ref<Student[]>([])
const loading = ref(true)
const importing = ref(false)
const error = ref('')
const importMessage = ref('')
const selectedFile = ref<File | null>(null)

const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const [courseData, studentData] = await Promise.all([
      fetchCourse(courseId),
      fetchCourseStudents(courseId),
    ])

    course.value = courseData
    students.value = studentData
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

.error {
  color: #b00020;
}

.success {
  color: #1b5e20;
}
</style>
