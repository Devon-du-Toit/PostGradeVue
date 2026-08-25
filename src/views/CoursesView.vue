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
    <header>
      <h1>Courses</h1>
      <p>Manage the courses connected to your PostGrade account.</p>
    </header>

    <section class="panel">
      <h2>Create course</h2>

      <form class="course-form" @submit.prevent="submitCourse">
        <label>
          Code
          <input v-model.trim="form.code" required placeholder="PHY301" />
        </label>

        <label>
          Name
          <input v-model.trim="form.name" required placeholder="Advanced Physics" />
        </label>

        <label>
          Year
          <input v-model.number="form.year" type="number" required min="2000" />
        </label>

        <label>
          Semester
          <select v-model.number="form.semester" required>
            <option :value="1">1</option>
            <option :value="2">2</option>
          </select>
        </label>

        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Creating…' : 'Create course' }}
        </button>
      </form>

      <p v-if="coursesStore.error" class="error">{{ coursesStore.error }}</p>
    </section>

    <section class="panel">
      <h2>Your courses</h2>

      <p v-if="coursesStore.loading">Loading courses…</p>
      <p v-else-if="coursesStore.courses.length === 0">No courses yet.</p>

      <ul v-else class="course-list">
        <li v-for="course in coursesStore.courses" :key="course.id">
          <RouterLink class="course-link" :to="`/courses/${course.id}`">
            <strong>{{ course.code }}</strong>
            <span>{{ course.name }}</span>
            <span>{{ course.year }} · Semester {{ course.semester }}</span>
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
  padding: 2rem 1rem;
}

.panel {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
}

.course-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

label {
  display: grid;
  gap: 0.4rem;
}

input,
select,
button {
  font: inherit;
  padding: 0.65rem 0.75rem;
}

button {
  cursor: pointer;
}

.course-list {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.course-list li {
  border-bottom: 1px solid #eee;
}

.course-link {
  display: grid;
  grid-template-columns: minmax(90px, 0.5fr) minmax(180px, 1.5fr) 1fr;
  gap: 1rem;
  padding: 0.85rem 0;
  color: inherit;
  text-decoration: none;
}

.course-link:hover {
  background: #f7f7f7;
}

.error {
  color: #b00020;
}
</style>
