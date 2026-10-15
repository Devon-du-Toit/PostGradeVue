<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchDashboardStats, type DashboardStats } from '@/services/dashboard'
import { fetchCourses } from '@/services/courses'
import type { Course } from '@/types/course'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
const stats = ref<DashboardStats | null>(null)
const courses = ref<Course[]>([])
const loading = ref(true)
const error = ref('')
const courseError = ref('')
onMounted(async () => {
  await Promise.all([
    (async () => {
      try {
        stats.value = await fetchDashboardStats()
      } catch {
        error.value = 'Could not load live dashboard summaries.'
      }
    })(),
    (async () => {
      try {
        courses.value = (await fetchCourses()).slice(0, 3)
      } catch {
        courseError.value = 'Could not load your courses.'
      }
    })(),
  ])
  loading.value = false
})
</script>
<template>
  <main class="dashboard">
    <header class="console-title">
      <div>
        <p class="page-eyebrow">OPERATIONS / OVERVIEW</p>
        <h1>Assessment command center</h1>
        <p>Live course activity and the next submissions that need attention.</p>
      </div>
      <RouterLink class="button-primary" to="/verification-queue"
        >Open verification <AppIcon name="arrow"
      /></RouterLink>
    </header>

    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <section class="signal-grid" aria-label="Workspace summary" :aria-busy="loading">
      <RouterLink class="signal-card glass-panel" to="/courses">
        <span class="signal-label"><AppIcon name="courses" /> ACTIVE COURSES</span>
        <strong>{{ stats?.active_courses ?? '—' }}</strong>
        <span class="signal-footer">Open course workspace <AppIcon name="arrow" /></span>
      </RouterLink>
      <RouterLink class="signal-card glass-panel" to="/verification-queue">
        <span class="signal-label"><AppIcon name="verify" /> PENDING MATCHES</span>
        <strong>{{ stats?.pending_verifications ?? '—' }}</strong>
        <span class="signal-footer">Review student matches <AppIcon name="arrow" /></span>
      </RouterLink>
      <div class="queue-card glass-panel">
        <div class="queue-card__icon"><AppIcon name="verify" /></div>
        <p class="page-eyebrow">NEXT ACTION</p>
        <h2>Keep the queue moving.</h2>
        <p>Confirm scanned pages and student details before returning scripts.</p>
        <RouterLink class="button-secondary" to="/verification-queue"
          >Review scripts <AppIcon name="arrow"
        /></RouterLink>
      </div>
    </section>

    <section class="course-section" aria-labelledby="courses-heading">
      <div class="section-heading">
        <div>
          <p class="page-eyebrow">YOUR DATA</p>
          <h2 id="courses-heading">Courses in progress</h2>
        </div>
        <RouterLink to="/courses">View all courses <AppIcon name="arrow" /></RouterLink>
      </div>
      <div class="course-table glass-panel">
        <div class="course-table__head">
          <span>COURSE</span><span>CODE</span><span>PERIOD</span><span>OPEN</span>
        </div>
        <p v-if="loading" class="course-state" role="status">Loading courses…</p>
        <AlertBox v-else-if="courseError" type="error">{{ courseError }}</AlertBox>
        <div v-else-if="!courses.length" class="course-state">
          <h3>No courses yet</h3>
          <p>Create a course to add students and assessments.</p>
          <RouterLink class="button-primary" to="/courses">Create course</RouterLink>
        </div>
        <template v-else>
          <RouterLink
            v-for="course in courses"
            :key="course.id"
            class="course-table__row"
            :to="`/courses/${course.id}`"
          >
            <strong>{{ course.name }}</strong>
            <span>{{ course.code }}</span>
            <span>{{ course.year }} · Semester {{ course.semester }}</span>
            <AppIcon name="arrow" />
          </RouterLink>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
.console-title {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  margin: 6px 0 28px;
}
.console-title h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 3vw, 3rem);
}
.console-title p:last-child {
  margin: 0;
  color: var(--text-secondary);
}
.console-title > a {
  flex-shrink: 0;
}
.page-eyebrow {
  margin: 0 0 9px;
  color: var(--accent-green);
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(280px, 1.15fr);
  gap: 16px;
}
.signal-card {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  padding: 25px;
  color: var(--text-primary);
  text-decoration: none;
}
.signal-card:hover {
  background: var(--glass-bg-hover);
}
.signal-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.signal-label svg {
  width: 19px;
  color: var(--accent-green);
}
.signal-card strong {
  font-size: clamp(3.4rem, 5vw, 5rem);
  line-height: 1;
  margin: 26px 0 auto;
  letter-spacing: -0.07em;
}
.signal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--table-divider);
  padding-top: 17px;
  color: var(--text-secondary);
  font-size: 0.78rem;
}
.signal-footer svg {
  width: 16px;
}
.queue-card {
  min-height: 260px;
  padding: 25px;
  background: var(--hero-bg);
  display: flex;
  flex-direction: column;
  align-items: start;
}
.queue-card__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #47bde022;
  color: var(--accent-green);
}
.queue-card h2 {
  margin: 0 0 8px;
  font-size: 1.48rem;
}
.queue-card > p:not(.page-eyebrow) {
  margin: 0 0 18px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}
.queue-card > a {
  margin-top: auto;
}
.course-section {
  margin-top: 38px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 17px;
}
.section-heading h2 {
  margin: 0;
  font-size: 1.5rem;
}
.section-heading > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  text-decoration: none;
  font-size: 0.82rem;
}
.course-table {
  overflow: hidden;
}
.course-table__head,
.course-table__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(80px, 0.7fr) minmax(140px, 1fr) 50px;
  align-items: center;
  gap: 16px;
  padding: 16px 25px;
}
.course-table__head {
  background: var(--surface-header);
  color: var(--text-secondary);
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.course-table__row {
  min-height: 70px;
  border-top: 1px solid var(--table-divider);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.85rem;
}
.course-table__row:hover {
  background: var(--surface-hover);
}
.course-table__row > span {
  color: var(--text-secondary);
}
.course-table__row > svg {
  width: 17px;
  justify-self: end;
  color: var(--accent-green);
}
.course-state {
  padding: 25px;
  color: var(--text-secondary);
}
.course-state h3 {
  color: var(--text-primary);
  margin: 0;
}
@media (max-width: 1000px) {
  .signal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .queue-card {
    grid-column: 1 / -1;
    min-height: 0;
  }
}
@media (max-width: 720px) {
  .console-title {
    display: grid;
  }
  .console-title > a {
    justify-self: start;
  }
  .signal-grid {
    grid-template-columns: 1fr;
  }
  .queue-card {
    grid-column: auto;
  }
  .signal-card {
    min-height: 190px;
  }
  .course-table__head {
    display: none;
  }
  .course-table__row {
    grid-template-columns: 1fr auto;
    gap: 4px 8px;
  }
  .course-table__row strong {
    grid-column: 1;
  }
  .course-table__row span {
    grid-column: 1;
  }
  .course-table__row > svg {
    grid-column: 2;
    grid-row: 1 / 4;
  }
}
</style>
