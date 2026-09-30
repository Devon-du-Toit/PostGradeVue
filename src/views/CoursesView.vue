<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useCoursesStore } from '@/stores/courses'

const coursesStore = useCoursesStore()
const submitting = ref(false)

const form = reactive({
  code: '',
  name: '',
  year: new Date().getFullYear(),
  semester: 1,
})

const submitCourse = async () => {
  submitting.value = true

  try {
    await coursesStore.addCourse({ ...form })
    form.code = ''
    form.name = ''
    form.semester = 1
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void coursesStore.loadCourses()
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

      <p v-if="coursesStore.error" class="error">{{ coursesStore.error }}</p>
    </section>

    <!-- Applied glass-panel to the list container -->
    <section class="panel glass-panel">
      <h2>Your courses</h2>

      <p v-if="coursesStore.loading" class="status-text">Loading courses…</p>
      <p v-else-if="coursesStore.courses.length === 0" class="status-text">No courses yet.</p>

      <ul v-else class="course-list">
        <li v-for="course in coursesStore.courses" :key="course.id">
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

.error {
  margin-top: 1.25rem;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--status-error);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
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
</style>
