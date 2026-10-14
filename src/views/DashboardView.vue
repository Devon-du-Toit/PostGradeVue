<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchDashboardStats, type DashboardStats } from '@/services/dashboard'
import { fetchCourses } from '@/services/courses'
import type { Course } from '@/types/course'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
const authStore = useAuthStore()
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
    <header class="dashboard-heading">
      <div>
        <p class="page-eyebrow">YOUR WORKSPACE</p>
        <h1>
          Good to see you{{ authStore.user?.first_name ? `, ${authStore.user.first_name}` : '' }}.
        </h1>
        <p>Pick up where you left off with courses and assessment scripts.</p>
      </div>
      <RouterLink class="button-primary" to="/verification-queue">
        Review submissions <AppIcon name="arrow" />
      </RouterLink>
    </header>

    <div class="dashboard-layout">
      <section class="course-zone" aria-labelledby="courses-heading">
        <div class="section-heading">
          <div>
            <p class="page-eyebrow">COURSE ADMINISTRATION</p>
            <h2 id="courses-heading">Your courses</h2>
          </div>
          <RouterLink to="/courses">View all courses <AppIcon name="arrow" /></RouterLink>
        </div>
        <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
        <div class="course-list glass-panel">
          <p v-if="loading" class="course-status" role="status">Loading courses…</p>
          <AlertBox v-else-if="courseError" type="error">{{ courseError }}</AlertBox>
          <div v-else-if="!courses.length" class="course-status">
            <h3>Start with a course</h3>
            <p>Create a course to organise students, assessments and scripts.</p>
            <RouterLink class="button-primary" to="/courses">Go to courses</RouterLink>
          </div>
          <template v-else>
            <RouterLink
              v-for="course in courses"
              :key="course.id"
              class="course-row"
              :to="`/courses/${course.id}`"
            >
              <span class="course-mark"><AppIcon name="courses" /></span>
              <span class="course-copy">
                <strong>{{ course.name }}</strong>
                <small
                  >{{ course.code }} · {{ course.year }} · Semester {{ course.semester }}</small
                >
              </span>
              <AppIcon name="arrow" />
            </RouterLink>
          </template>
        </div>
      </section>

      <aside class="insights-rail" aria-label="Workspace overview">
        <section class="focus-card glass-panel">
          <p class="page-eyebrow">TODAY'S FOCUS</p>
          <h2>Every script, a clear next step.</h2>
          <p>Confirm student matches before returning assessment scripts.</p>
          <RouterLink class="button-secondary" to="/verification-queue">
            Open verification <AppIcon name="arrow" />
          </RouterLink>
        </section>
        <section class="rail-stats" aria-label="Live summary" :aria-busy="loading">
          <RouterLink class="workspace-stat glass-panel" to="/courses">
            <span>Active courses <AppIcon name="courses" /></span>
            <strong>{{ stats?.active_courses ?? '—' }}</strong>
            <small>Manage courses <AppIcon name="arrow" /></small>
          </RouterLink>
          <RouterLink class="workspace-stat glass-panel" to="/verification-queue">
            <span>Awaiting verification <AppIcon name="verify" /></span>
            <strong>{{ stats?.pending_verifications ?? '—' }}</strong>
            <small>Review matches <AppIcon name="arrow" /></small>
          </RouterLink>
        </section>
        <section class="workflow-note glass-panel">
          <p class="page-eyebrow">HOW IT FLOWS</p>
          <ol>
            <li>Upload assessment pages</li>
            <li>Recognise and review matches</li>
            <li>Return verified scripts</li>
          </ol>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 1320px;
  margin: 0 auto;
}
.dashboard-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 2rem;
  margin-bottom: 38px;
}
.dashboard-heading h1 {
  margin: 0 0 8px;
  font-size: clamp(2.2rem, 3vw, 3.2rem);
}
.dashboard-heading p:last-child {
  margin: 0;
  color: var(--text-secondary);
}
.dashboard-heading > a {
  flex-shrink: 0;
}
.page-eyebrow {
  margin: 0 0 10px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--accent-green);
}
.dashboard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.9fr);
  gap: 28px;
  align-items: start;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 18px;
}
.section-heading h2 {
  margin: 0;
  font-size: 1.65rem;
}
.section-heading > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 0.85rem;
  text-decoration: none;
  white-space: nowrap;
}
.course-list {
  padding: 8px 26px;
}
.course-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 23px 0;
  border-bottom: 1px solid var(--table-divider);
  color: var(--text-primary);
  text-decoration: none;
}
.course-row:last-child {
  border-bottom: 0;
}
.course-row:hover .course-copy strong {
  color: var(--accent-green);
}
.course-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-header);
  color: var(--accent-green);
  flex-shrink: 0;
}
.course-copy {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.course-copy strong {
  font-size: 0.96rem;
}
.course-copy small {
  color: var(--text-secondary);
  font-size: 0.78rem;
}
.course-status {
  padding: 26px 0;
  color: var(--text-secondary);
}
.course-status h3 {
  margin: 0 0 4px;
  color: var(--text-primary);
}
.insights-rail {
  display: grid;
  gap: 16px;
}
.focus-card {
  padding: 26px;
  background: var(--hero-bg);
}
.focus-card h2 {
  max-width: 250px;
  margin: 0 0 14px;
  font-size: 1.75rem;
}
.focus-card > p:not(.page-eyebrow) {
  margin: 0 0 24px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.focus-card > a {
  width: 100%;
}
.rail-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.workspace-stat {
  display: grid;
  gap: 9px;
  padding: 20px;
  color: var(--text-primary);
  text-decoration: none;
}
.workspace-stat > span,
.workspace-stat > small {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
.workspace-stat strong {
  font-size: 2.1rem;
  line-height: 1;
}
.workspace-stat small {
  padding-top: 10px;
  border-top: 1px solid var(--table-divider);
}
.workspace-stat svg {
  width: 16px;
  flex-shrink: 0;
}
.workflow-note {
  padding: 22px 26px;
}
.workflow-note ol {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-secondary);
  font-size: 0.83rem;
  line-height: 2;
}
@media (max-width: 1120px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  .insights-rail {
    grid-template-columns: 1fr 1fr;
  }
  .rail-stats {
    align-self: stretch;
  }
  .workflow-note {
    grid-column: 1 / -1;
  }
}
@media (max-width: 720px) {
  .dashboard-heading {
    display: grid;
    gap: 18px;
  }
  .dashboard-heading > a {
    justify-self: start;
  }
  .insights-rail {
    grid-template-columns: 1fr;
  }
  .workflow-note {
    grid-column: auto;
  }
  .section-heading {
    align-items: start;
  }
  .section-heading > a {
    white-space: normal;
  }
}
</style>
