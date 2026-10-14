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
    <section class="lead-grid">
      <header class="feature-hero">
        <p class="page-eyebrow">POSTGRADE / LECTURER</p>
        <h1>Assessment work, beautifully in order.</h1>
        <p>
          Welcome{{ authStore.user?.first_name ? `, ${authStore.user.first_name}` : '' }}. Keep your
          courses, student matches and returned scripts moving in one considered workspace.
        </p>
        <RouterLink class="button-primary" to="/verification-queue"
          >Review pending scripts <AppIcon name="arrow"
        /></RouterLink>
      </header>
      <aside class="review-note glass-panel">
        <span class="note-number">01 / THE PRIORITY</span>
        <div class="note-icon"><AppIcon name="verify" /></div>
        <h2>Verification, made clear.</h2>
        <p>Check scanned pages and confirm student details before returning scripts.</p>
        <RouterLink to="/verification-queue">Open verification <AppIcon name="arrow" /></RouterLink>
      </aside>
    </section>

    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <section class="overview-band" aria-label="Workspace summary" :aria-busy="loading">
      <RouterLink to="/courses">
        <span>01 / ACTIVE COURSES</span>
        <strong>{{ stats?.active_courses ?? '—' }}</strong>
        <small>Manage your course collection <AppIcon name="arrow" /></small>
      </RouterLink>
      <RouterLink to="/verification-queue">
        <span>02 / AWAITING VERIFICATION</span>
        <strong>{{ stats?.pending_verifications ?? '—' }}</strong>
        <small>Review student matches <AppIcon name="arrow" /></small>
      </RouterLink>
    </section>

    <section class="courses-section" aria-labelledby="courses-heading">
      <div class="section-heading">
        <div>
          <p class="page-eyebrow">YOUR COLLECTION</p>
          <h2 id="courses-heading">Courses</h2>
          <p>Every assessment begins here.</p>
        </div>
        <RouterLink to="/courses">Explore all courses <AppIcon name="arrow" /></RouterLink>
      </div>
      <p v-if="loading" class="course-state" role="status">Loading courses…</p>
      <AlertBox v-else-if="courseError" type="error">{{ courseError }}</AlertBox>
      <div v-else-if="!courses.length" class="course-state glass-panel">
        <h3>No courses yet</h3>
        <p>Create a course to add students and assessments.</p>
        <RouterLink class="button-primary" to="/courses">Create course</RouterLink>
      </div>
      <div v-else class="course-gallery">
        <RouterLink
          v-for="(course, index) in courses"
          :key="course.id"
          class="course-card glass-panel"
          :to="`/courses/${course.id}`"
        >
          <span class="course-index">0{{ index + 1 }} / COURSE</span>
          <span class="course-symbol"><AppIcon name="courses" /></span>
          <h3>{{ course.name }}</h3>
          <p>{{ course.code }} · {{ course.year }} · Semester {{ course.semester }}</p>
          <span class="course-open">Open course <AppIcon name="arrow" /></span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 1300px;
  margin: 0 auto;
}
.page-eyebrow {
  margin: 0 0 18px;
  color: var(--accent-green);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
}
.lead-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.8fr);
  gap: 22px;
}
.feature-hero {
  min-height: 350px;
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: clamp(34px, 5vw, 64px);
  border: 1px solid var(--glass-border);
  background: var(--hero-bg);
  position: relative;
  overflow: hidden;
}
.feature-hero::after {
  content: '';
  width: 285px;
  height: 285px;
  position: absolute;
  right: -90px;
  bottom: -120px;
  border: 1px solid #9d795b55;
  border-radius: 48% 0 48% 0;
  transform: rotate(-30deg);
  box-shadow:
    0 0 0 45px #b7906e14,
    0 0 0 90px #b7906e0c;
  pointer-events: none;
}
.feature-hero h1 {
  max-width: 630px;
  margin: 0 0 16px;
  font-size: clamp(2.6rem, 4vw, 4.25rem);
  line-height: 1.08;
}
.feature-hero > p:not(.page-eyebrow) {
  max-width: 520px;
  margin: 0 0 28px;
  color: var(--text-secondary);
  font-size: 0.93rem;
}
.feature-hero > a {
  margin-top: auto;
}
.review-note {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: start;
}
.note-number,
.course-index {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}
.note-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin: 30px 0 22px;
  background: var(--surface-header);
  color: var(--accent-green);
}
.review-note h2 {
  margin: 0 0 12px;
  font-size: 1.9rem;
}
.review-note p {
  margin: 0 0 24px;
  color: var(--text-secondary);
  font-size: 0.87rem;
}
.review-note > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}
.overview-band {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 36px 0 52px;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}
.overview-band a {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 14px;
  padding: 25px 32px;
  color: var(--text-primary);
  text-decoration: none;
}
.overview-band a:first-child {
  border-right: 1px solid var(--glass-border);
}
.overview-band a > span {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.overview-band strong {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 3.1rem;
  font-weight: 500;
  line-height: 1.15;
}
.overview-band small {
  display: inline-flex;
  align-items: center;
  align-self: end;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
.overview-band small svg {
  width: 16px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  margin-bottom: 20px;
}
.section-heading h2 {
  margin: 0 0 4px;
  font-size: 2.2rem;
}
.section-heading p:not(.page-eyebrow) {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.87rem;
}
.section-heading > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  min-height: 44px;
  font-size: 0.85rem;
}
.course-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.course-card {
  display: flex;
  flex-direction: column;
  align-items: start;
  min-height: 260px;
  padding: 26px;
  color: var(--text-primary);
  text-decoration: none;
}
.course-card:hover {
  border-color: var(--glass-border-highlight);
  background: var(--glass-bg-hover);
}
.course-symbol {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin: 22px 0 14px;
  background: var(--surface-header);
  color: var(--accent-green);
}
.course-card h3 {
  margin: 0 0 7px;
  font-size: 1.45rem;
}
.course-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.course-open {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 25px;
  color: var(--accent-green);
  font-size: 0.79rem;
  font-weight: 600;
}
.course-open svg {
  width: 16px;
}
.course-state {
  padding: 24px;
  color: var(--text-secondary);
}
.course-state h3 {
  color: var(--text-primary);
  margin: 0;
}
@media (max-width: 960px) {
  .lead-grid {
    grid-template-columns: 1fr;
  }
  .review-note {
    min-height: 220px;
  }
}
@media (max-width: 720px) {
  .overview-band {
    grid-template-columns: 1fr;
  }
  .overview-band a:first-child {
    border-right: 0;
    border-bottom: 1px solid var(--glass-border);
  }
  .course-gallery {
    grid-template-columns: 1fr;
  }
  .section-heading {
    align-items: start;
  }
  .section-heading > a {
    max-width: 125px;
  }
}
</style>
