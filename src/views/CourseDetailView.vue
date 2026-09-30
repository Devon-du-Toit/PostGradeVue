<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { createAssessment, fetchCourseAssessments } from '@/services/assessments'
import { fetchCourse } from '@/services/courses'
import {
  fetchCourseStudents,
  importCourseStudents,
  removeCourseStudent,
  type ImportRowError,
  type ImportSummary
} from '@/services/students'
import type { Assessment } from '@/types/assessment'
import type { Course } from '@/types/course'
import type { Student } from '@/types/student'
import AlertBox from '@/components/AlertBox.vue'

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

// New state for Issue #7 requirements
const updateExisting = ref(false)
const filePreviewCount = ref<number | null>(null)
const importSummary = ref<ImportSummary | null>(null)
const importErrors = ref<ImportRowError[]>([])

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

// New state for custom confirmation modal
const studentToRemove = ref<{id: number, name: string} | null>(null)
const removingStudentId = ref<number | null>(null)

const promptRemoveStudent = (studentId: number, name: string) => {
  studentToRemove.value = { id: studentId, name }
}

const cancelRemove = () => {
  studentToRemove.value = null
}

const confirmRemoveStudent = async () => {
  if (!studentToRemove.value) return

  const { id } = studentToRemove.value
  removingStudentId.value = id
  error.value = ''

  try {
    await removeCourseStudent(courseId, id)
    students.value = students.value.filter(s => s.id !== id)
    studentToRemove.value = null
  } catch (e) {
    const err = e as {
      response?: {
        data?: {
          message?: string
          detail?: string
        }
      }
    }

    error.value = err.response?.data?.message || err.response?.data?.detail || 'Could not remove student. Please try again.'
    studentToRemove.value = null
  } finally {
    removingStudentId.value = null
  }
}
const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file
  importMessage.value = ''
  error.value = ''
  importSummary.value = null
  importErrors.value = []

  // Instantly read the CSV locally to provide a row count preview
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        filePreviewCount.value = Math.max(0, lines.length - 1) // Subtract header
      }
    }
    reader.readAsText(file)
  } else {
    filePreviewCount.value = null
  }
}

const importStudents = async () => {
  if (!selectedFile.value) {
    error.value = 'Choose a CSV file first.'
    return
  }

  importing.value = true
  error.value = ''
  importMessage.value = ''
  importSummary.value = null
  importErrors.value = []

  try {
    const response = await importCourseStudents(courseId, selectedFile.value, updateExisting.value)
    importMessage.value = response.message

    if (response.summary) importSummary.value = response.summary
    if (response.errors) importErrors.value = response.errors

    students.value = await fetchCourseStudents(courseId)
    selectedFile.value = null
    filePreviewCount.value = null
  }catch (e) {
    const err = e as {
      response?: {
        data?: {
          message?: string
          summary?: ImportSummary
          errors?: ImportRowError[]
        }
      }
    }

    if (err.response?.data) {
      error.value = err.response.data.message || 'Import completed with errors.'
      if (err.response.data.summary) importSummary.value = err.response.data.summary
      if (err.response.data.errors) importErrors.value = err.response.data.errors
    } else {
      error.value = 'Could not import students. Check the CSV columns and values.'
    }
  } finally {
    importing.value = false
  }
}

const submitAssessment = async () => {
  // ... existing implementation remains exactly the same
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
    <AlertBox v-else-if="error && !course" type="error">{{ error }}</AlertBox>

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
          <br />
          <a
            class="csv-template-link"
            href="data:text/csv;charset=utf-8,student_number,first_name,last_name,email%0A12345678,John,Doe,john@example.com%0A87654321,Jane,Smith,jane@example.com"
            download="student_import_template.csv"
          >
            Download example template
          </a>
        </p>

        <form class="import-controls" @submit.prevent="importStudents">
          <input class="file-input" type="file" accept=".csv,text/csv" @change="handleFileChange" />

          <label class="checkbox-label">
            <input type="checkbox" v-model="updateExisting" />
            Update existing students (overwrite duplicates)
          </label>

          <button class="btn-primary" type="submit" :disabled="importing || !selectedFile">
            {{ importing ? 'Importing…' : 'Import CSV' }}
          </button>
        </form>

        <!-- Pre-upload Preview -->
        <p v-if="filePreviewCount !== null && !importing" class="status-text preview-text">
          Preview: Found ~{{ filePreviewCount }} student(s) in selected file.
        </p>

        <AlertBox v-if="importMessage" type="success">{{ importMessage }}</AlertBox>
        <AlertBox v-if="error" type="error">{{ error }}</AlertBox>

        <!-- Post-upload Summary -->
        <div v-if="importSummary" class="import-summary">
          <p><strong>Processed:</strong> {{ importSummary.total }}</p>
          <p class="text-success"><strong>Added:</strong> {{ importSummary.created }}</p>
          <p class="text-warning"><strong>Updated:</strong> {{ importSummary.updated }}</p>
          <p class="text-error"><strong>Failed:</strong> {{ importSummary.failed }}</p>
        </div>

        <!-- Post-upload Row-level Errors -->
        <div v-if="importErrors.length > 0" class="student-table-wrap error-table-wrap">
          <table class="student-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Student Number</th>
                <th>Error Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(err, index) in importErrors" :key="index">
                <td class="muted-cell">{{ err.row || '-' }}</td>
                <td class="highlight-cell">{{ err.student_number || 'Unknown' }}</td>
                <td class="text-error">{{ err.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.id">
                <td class="highlight-cell">{{ student.student_number }}</td>
                <td>{{ student.first_name }} {{ student.last_name }}</td>
                <td class="muted-cell">{{ student.email }}</td>
                <td class="actions-col">
                  <button
                    class="btn-text btn-danger"
                    :disabled="removingStudentId === student.id"
                    @click="promptRemoveStudent(student.id, `${student.first_name} ${student.last_name}`)"
                  >
                    {{ removingStudentId === student.id ? '...' : 'Remove' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <!-- Custom Glass Modal for Removal Confirmation -->
    <div v-if="studentToRemove" class="modal-overlay" @click.self="cancelRemove">
      <div class="panel glass-panel modal-content">
        <h3>Remove Student</h3>
        <p>
          Are you sure you want to remove <strong>{{ studentToRemove.name }}</strong> from this course?
          <br><br>
          <span class="text-error">Warning: This will also remove any associated grades.</span>
        </p>
        <div class="modal-actions">
          <button class="btn-text" @click="cancelRemove" :disabled="removingStudentId !== null">Cancel</button>
          <button
            class="btn-primary btn-danger-solid"
            :disabled="removingStudentId === studentToRemove.id"
            @click="confirmRemoveStudent"
          >
            {{ removingStudentId === studentToRemove.id ? 'Removing...' : 'Yes, remove student' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.course-detail-page {
  max-width: 1100px; /* Widened slightly to give the table breathing room */
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
}

.preview-text {
  margin-top: 1rem;
  color: var(--accent-green);
}

.import-summary {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
}

.import-summary p {
  margin: 0;
}

.text-success { color: #86efac; }
.text-warning { color: #fde047; }
.text-error { color: #fca5a5; }

.error-table-wrap {
  margin-top: 1rem;
  border-color: rgba(239, 68, 68, 0.3);
}

.error-table-wrap th {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
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

.csv-template-link {
  display: inline-block;
  margin-top: 0.75rem;
  color: var(--pg-blue, #3b82f6);
  text-decoration: underline;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.csv-template-link:hover {
  color: var(--accent-green);
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

.actions-col {
  text-align: right !important;
  width: 90px;
}

.btn-text {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s ease;
}

.btn-danger {
  color: var(--text-muted);
}

.btn-danger:hover:not(:disabled) {
  color: #fca5a5;
  text-decoration: underline;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* Custom Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  max-width: 450px;
  width: 90%;
  border: 1px solid rgba(239, 68, 68, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  margin-bottom: 0; /* Override panel default */
}

.modal-content h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-danger-solid {
  background: rgba(239, 68, 68, 0.8) !important;
  color: white !important;
  border-color: rgba(239, 68, 68, 1) !important;
}

.btn-danger-solid:hover:not(:disabled) {
  background: rgba(239, 68, 68, 1) !important;
}
</style>
