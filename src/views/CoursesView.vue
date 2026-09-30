<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { createCourse, fetchCourses } from '@/services/courses'
import type { Course } from '@/types/course'
import AlertBox from '@/components/AlertBox.vue'

const route = useRoute()
const router = useRouter()

const submitting = ref(false)
const form = reactive({
  code: '',
  name: '',
  year: new Date().getFullYear(),
  semester: 1,
})

// --- Search & Filter State ---
const courses = ref<Course[]>([])
const loading = ref(true)
const error = ref('')

// 1. URL Syncing: Initialize filters directly from URL query parameters
const filters = reactive({
  search: (route.query.search as string) || '',
  year: route.query.year ? Number(route.query.year) : '',
  semester: route.query.semester ? Number(route.query.semester) : '',
})

let abortController: AbortController | null = null
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const loadFilteredCourses = async () => {
  loading.value = true
  error.value = ''

  // 2. Stale Response Prevention: Cancel the previous request if it's still running
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  try {
// Strip out empty filters before sending to the backend
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter((entry) => entry[1] !== '' && entry[1] !== null)
    )

    courses.value = await fetchCourses(activeFilters, abortController.signal)
  } catch (e) {
    const err = e as { name?: string; code?: string }
    // If the error is just an abort cancellation from typing fast, ignore it
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return

    error.value = 'Could not load courses.'
    courses.value = []
  } finally {
    loading.value = false
  }
}

// 3. Debouncing: Watch for filter changes, sync the URL, and wait before fetching
watch(
  filters,
 (newFilters) => {
    const query = Object.fromEntries(
      Object.entries(newFilters).filter((entry) => entry[1] !== '' && entry[1] !== null)
    )
    void router.replace({ query })

    if (debounceTimeout) clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      void loadFilteredCourses()
    }, 300) // 300ms delay
  },
  { deep: true }
)

const submitCourse = async () => {
  submitting.value = true
  error.value = ''
  try {
    await createCourse({ ...form })
    form.code = ''
    form.name = ''
    form.semester = 1
    void loadFilteredCourses() // Refresh the list
  } catch {
    error.value = 'Could not create course. Please check the values.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadFilteredCourses()
})
</script>

<template>
  <main class="courses-page">
    <header class="page-header">
      <h1>Courses</h1>
      <p>Manage the courses connected to your PostGrade account.</p>
    </header>

    <!-- Applied glass-panel to the form container -->
    <section class="panel glass-panel">
      <h2>Create course</h2>

      <form class="course-form" @submit.prevent="submitCourse">
        <label>
          Code
          <!-- Applied glass-input -->
          <input class="glass-input" v-model.trim="form.code" required placeholder="PHY301" />
        </label>

        <label>
          Name
          <input class="glass-input" v-model.trim="form.name" required placeholder="Advanced Physics" />
        </label>

        <label>
          Year
          <input class="glass-input" v-model.number="form.year" type="number" required min="2000" />
        </label>

        <label>
          Semester
          <select class="glass-input" v-model.number="form.semester" required>
            <option :value="1">1</option>
            <option :value="2">2</option>
          </select>
        </label>

        <!-- Applied btn-primary -->
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? 'Creating…' : 'Create course' }}
        </button>
      </form>

      <AlertBox type="error" v-if="error" class="error">{{ error }}</AlertBox>
    </section>

   <!-- Applied glass-panel to the list container -->
    <section class="panel glass-panel">
      <div class="list-header">
        <h2>Your courses</h2>

        <div class="filters-bar">
          <input class="glass-input search-input" v-model="filters.search" placeholder="Search course name or code..." />
          <select class="glass-input" v-model="filters.year">
            <option value="">All years</option>
            <option :value="2028">2028</option>
            <option :value="2027">2027</option>
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
          <select class="glass-input" v-model="filters.semester">
            <option value="">All semesters</option>
            <option :value="1">Semester 1</option>
            <option :value="2">Semester 2</option>
          </select>
        </div>
      </div>

      <p v-if="loading" class="status-text">Loading courses…</p>
      <AlertBox type="error" v-else-if="error" class="status-text">{{ error }}</AlertBox>
      <AlertBox type="info" v-else-if="courses.length === 0" class="status-text">
        No courses found matching those filters.
      </AlertBox>

      <ul v-else class="course-list">
        <li v-for="course in courses" :key="course.id">
          <RouterLink class="course-link" :to="`/courses/${course.id}`">
            <strong class="course-code">{{ course.code }}</strong>
            <span class="course-name">{{ course.name }}</span>
            <span class="course-meta">{{ course.year }} · Semester {{ course.semester }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.courses-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
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
  margin-bottom: 2.5rem;
  padding: 2rem;
  /* Removed the hardcoded #ddd border, the glass-panel class handles this now */
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.course-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
  align-items: end;
}

label {
  display: grid;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

button {
  margin-top: 0.5rem; /* Aligns button nicely with the inputs */
}

/* Custom styling to make the <select> dropdown arrow match the dark glass theme */
select.glass-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem top 50%;
  background-size: 0.65rem auto;
}
/* Style the dropdown options so they are readable */
select.glass-input option {
  background: #151f32;
  color: var(--text-primary);
}

.status-text {
  color: var(--text-muted);
  font-style: italic;
}

.course-list {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
  margin: 0;
}

.course-link {
  display: grid;
  grid-template-columns: minmax(90px, 0.5fr) minmax(180px, 1.5fr) 1fr;
  gap: 1rem;
  padding: 1.25rem 1rem;
  color: inherit;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  align-items: center;
}

.course-link:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border);
  transform: translateX(4px); /* Sleek slide-in effect */
}

.course-code {
  color: var(--accent-green);
  font-size: 1.1rem;
  font-weight: 700;
}

.course-name {
  color: var(--text-primary);
  font-weight: 600;
}

.course-meta {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: right;
}

@media (max-width: 720px) {
  .course-link {
    grid-template-columns: 1fr;
    gap: 0.4rem;
    padding: 1rem;
  }
  .course-meta {
    text-align: left;
  }
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.list-header h2 {
  margin-bottom: 0;
}

.filters-bar {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
}

/* Forces all inputs in the bar to respect their grid column boundaries */
.filters-bar > * {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0;
}

@media (max-width: 720px) {
  .filters-bar {
    grid-template-columns: 1fr;
  }
}
</style>
