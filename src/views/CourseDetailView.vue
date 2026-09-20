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
    <RouterLink class="back-link" to="/courses">← Back to courses</RouterLink>

    <p v-if="loading" class="status-text loading-text">Loading course…</p>
    <p v-else-if="error && !course" class="error-box">{{ error }}</p>

    <template v-else-if="course">
      <header class="course-header">
        <div>
          <p class="course-code">{{ course.code }}</p>
          <h1>{{ course.name }}</h1>
        </div>
        <div class="course-actions">
          <p class="course-meta">{{ course.year }} · Semester {{ course.semester }}</p>
          <!-- Converted to a glassy button style -->
          <RouterLink class="gradebook-link btn-primary" :to="`/courses/${courseId}/gradebook`">
            View gradebook
          </RouterLink>
        </div>
      </header>

      <!-- Applied glass-panel -->
      <section class="panel glass-panel">
        <h2>Assessments</h2>

        <form class="assessment-form" @submit.prevent="submitAssessment">
          <label>
            Name
            <!-- Applied glass-input -->
            <input class="glass-input" v-model.trim="assessmentForm.name" required placeholder="Test 1" />
          </label>

          <label>
            Maximum mark
            <input class="glass-input" v-model.number="assessmentForm.max_mark" type="number" min="1" step="0.01" required />
          </label>

          <label>
            Weight (%)
            <input class="glass-input" v-model.number="assessmentForm.weight" type="number" min="0" max="100" step="0.01" required />
          </label>

          <label>
            Date
            <input class="glass-input" v-model="assessmentForm.date" type="date" required />
          </label>

          <!-- Applied btn-primary -->
          <button class="btn-primary" type="submit" :disabled="creatingAssessment">
            {{ creatingAssessment ? 'Creating…' : 'Create assessment' }}
          </button>
        </form>

        <p v-if="assessments.length === 0" class="empty-state status-text">No assessments yet.</p>

        <ul v-else class="assessment-list">
          <li v-for="assessment in assessments" :key="assessment.id">
            <RouterLink class="assessment-link" :to="`/assessments/${assessment.id}`">
              <strong class="assessment-name">{{ assessment.name }}</strong>
              <span class="assessment-date">{{ assessment.date }}</span>
              <span class="assessment-stats">{{ assessment.max_mark }} marks · {{ assessment.weight }}%</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- Applied glass-panel -->
      <section class="panel glass-panel">
        <h2>Import students</h2>
        <p class="import-instructions">
          Upload a CSV with the columns
          <code>student_number</code>, <code>first_name</code>,
          <code>last_name</code>, and <code>email</code>.
        </p>

        <div class="import-controls">
          <!-- The file input will inherit the text color naturally now -->
          <input class="file-input" type="file" accept=".csv,text/csv" @change="handleFileChange" />
          <!-- Applied btn-primary -->
          <button class="btn-primary" type="button" :disabled="importing || !selectedFile" @click="importStudents">
            {{ importing ? 'Importing…' : 'Import CSV' }}
          </button>
        </div>

        <p v-if="importMessage" class="success-box">{{ importMessage }}</p>
        <p v-if="error" class="error-box">{{ error }}</p>
      </section>

      <!-- Applied glass-panel -->
      <section class="panel glass-panel">
        <h2>Students</h2>

        <p v-if="students.length === 0" class="status-text">No students enrolled yet.</p>

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
                <td class="highlight-cell">{{ student.student_number }}</td>
                <td>{{ student.first_name }} {{ student.last_name }}</td>
                <td class="muted-cell">{{ student.email }}</td>
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
  max-width: 1100px; /* Widened slightly to give the table breathing room */
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

.course-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

.course-actions {
  display: grid;
  gap: 1rem;
  justify-items: end;
}

.course-meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.gradebook-link {
  text-decoration: none;
  display: inline-block;
}

.course-code {
  margin-bottom: 0.5rem;
  color: var(--accent-green);
  font-weight: 700;
  letter-spacing: 0.05em;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.course-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 2.2rem;
  line-height: 1.1;
}

.panel {
  margin-bottom: 2.5rem;
  padding: 2rem;
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.assessment-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.25rem;
  align-items: end;
}

.assessment-form label {
  display: grid;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.assessment-form input,
.assessment-form button {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  font: inherit;
}

.assessment-list {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  margin-top: 2rem;
  list-style: none;
}

.assessment-link {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) 1fr 1fr;
  gap: 1rem;
  padding: 1.25rem 1rem;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: inherit;
  text-decoration: none;
  transition: all 0.2s ease;
  align-items: center;
}

.assessment-link:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-highlight);
}

.assessment-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.05rem;
}

.assessment-date, .assessment-stats {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.import-instructions {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

code {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--glass-border);
  color: var(--accent-green);
  font-family: monospace;
  font-size: 0.85rem;
}

.import-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

/* Custom styling for the file upload button */
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

/* Data Table Styling */
.student-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
}

.student-table {
  width: 100%;
  border-collapse: collapse;
}

.student-table th {
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

.student-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.student-table tr:last-child td {
  border-bottom: none;
}

.student-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.highlight-cell {
  font-family: monospace;
  color: var(--text-primary);
}

.muted-cell {
  color: var(--text-secondary) !important;
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

@media (max-width: 760px) {
  .course-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .course-actions {
    justify-items: start;
  }
  .assessment-link {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}
</style>
