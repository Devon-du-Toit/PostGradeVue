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
    <header class="dashboard-hero">
      <div>
        <p class="page-eyebrow">POSTGRADE / LECTURER</p>
        <h1>Assessment workspace</h1>
        <p class="dashboard-subtitle">
          Welcome{{ authStore.user?.first_name ? `, ${authStore.user.first_name}` : '' }}. Manage
          your courses, verify student matches and return assessment scripts.
        </p>
        <RouterLink class="button-primary" to="/verification-queue"
          >Review pending scripts <AppIcon name="arrow"
        /></RouterLink>
      </div>
    </header>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <section class="summary-grid" aria-label="Workspace summary" :aria-busy="loading">
      <RouterLink class="summary-card glass-panel" to="/courses"
        ><span>Active courses<AppIcon name="courses" /></span
        ><strong>{{ stats?.active_courses ?? '—' }}</strong
        ><small>Manage courses and enrolled students <AppIcon name="arrow" /></small></RouterLink
      ><RouterLink class="summary-card glass-panel" to="/verification-queue"
        ><span>Awaiting verification<AppIcon name="verify" /></span
        ><strong>{{ stats?.pending_verifications ?? '—' }}</strong
        ><small>Review student matches <AppIcon name="arrow" /></small
      ></RouterLink>
    </section>
    <div class="dashboard-columns">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="page-eyebrow">COURSE ADMINISTRATION</p>
            <h2>Your courses</h2>
          </div>
          <RouterLink to="/courses">View all <AppIcon name="arrow" /></RouterLink>
        </div>
        <div class="dashboard-courses glass-panel">
          <p v-if="loading" class="course-status" role="status">Loading courses…</p>
          <AlertBox v-else-if="courseError" type="error">{{ courseError }}</AlertBox>
          <div v-else-if="!courses.length" class="course-status">
            <h3>No courses yet</h3>
            <p>Create a course to add students and assessments.</p>
            <RouterLink class="button-secondary" to="/courses">Create course</RouterLink>
          </div>
          <RouterLink
            v-for="course in courses"
            v-else
            :key="course.id"
            class="dashboard-course"
            :to="`/courses/${course.id}`"
            ><span class="course-symbol"><AppIcon name="courses" /></span
            ><span
              ><strong>{{ course.name }}</strong
              ><small
                >{{ course.code }} · {{ course.year }} · Semester {{ course.semester }}</small
              ></span
            ><AppIcon name="arrow"
          /></RouterLink>
        </div>
      </section>
      <section class="verification-card glass-panel">
        <span class="verification-icon"><AppIcon name="verify" /></span>
        <p class="page-eyebrow">SCRIPT REVIEW</p>
        <h2>Pending verification</h2>
        <p>Check scanned pages and confirm student details before returning assessment scripts.</p>
        <RouterLink class="button-secondary" to="/verification-queue"
          >Open verification <AppIcon name="arrow"
        /></RouterLink>
      </section>
    </div>
  </main>
</template>
<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  align-items: center;
  padding: 34px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--hero-bg);
  margin-bottom: 24px;
}
.page-eyebrow {
  color: var(--text-muted);
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  font-weight: 650;
  margin: 0 0 12px;
}
.dashboard-hero h1 {
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  margin: 0 0 16px;
}
.dashboard-subtitle {
  max-width: 560px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 24px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 32px;
}
.summary-card {
  display: block;
  padding: 22px;
  color: var(--text-primary);
  text-decoration: none;
}
.summary-card:hover {
  border-color: var(--accent-green);
}
.summary-card > span,
.summary-card > small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.summary-card > strong {
  display: block;
  font-size: 2.2rem;
  font-family: Consolas, monospace;
  line-height: 1.3;
  margin: 12px 0;
}
.summary-card > small {
  border-top: 1px solid var(--glass-border);
  padding-top: 12px;
  font-size: 0.75rem;
}
.summary-card svg {
  width: 17px;
}
.dashboard-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 24px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 20px;
}
.section-heading .page-eyebrow {
  margin-bottom: 8px;
}
.section-heading h2 {
  margin: 0;
}
.section-heading > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  text-decoration: none;
  min-height: 44px;
}
.dashboard-courses {
  padding: 0 22px;
}
.dashboard-course {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 0;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
  text-decoration: none;
}
.dashboard-course:last-child {
  border: 0;
}
.dashboard-course > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}
.dashboard-course strong {
  display: block;
  font-size: 0.85rem;
}
.dashboard-course small {
  display: block;
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-top: 4px;
}
.dashboard-course:hover strong {
  color: var(--accent-green);
}
.course-symbol,
.verification-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--surface-hover);
  color: var(--accent-green);
  flex-shrink: 0;
}
.verification-card {
  padding: 26px;
}
.verification-icon {
  margin-bottom: 22px;
}
.verification-card h2 {
  margin: 0 0 14px;
}
.verification-card > p:not(.page-eyebrow) {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0 0 22px;
}
.verification-card > a {
  width: 100%;
}
.course-status {
  padding: 22px 0;
  color: var(--text-secondary);
}
.course-status h3 {
  margin: 0;
}
.course-status p {
  font-size: 0.85rem;
}
.dashboard-courses > :deep(.alert) {
  margin: 22px 0;
}
@media (max-width: 760px) {
  .dashboard-columns {
    grid-template-columns: 1fr;
  }
  .dashboard-hero {
    padding: 26px;
    grid-template-columns: 1fr;
  }
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-course {
    gap: 10px;
  }
  .dashboard-hero h1 {
    font-size: 2rem;
  }
}
</style>
