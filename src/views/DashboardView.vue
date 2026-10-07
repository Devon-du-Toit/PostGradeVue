<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { fetchDashboardStats, type DashboardStats } from '@/services/dashboard'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'

const authStore = useAuthStore()
const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await fetchDashboardStats()
  } catch {
    error.value = 'Could not load live dashboard summaries.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="dashboard">
    <header class="dashboard-hero">
      <div>
        <p class="page-eyebrow">Workspace</p>
        <h1>Welcome{{ authStore.user?.first_name ? `, ${authStore.user.first_name}` : '' }}.</h1>
        <p class="dashboard-subtitle">
          Manage courses, review submission matches and return verified scripts to students.
        </p>
      </div>
      <div class="hero-summary" aria-label="Workspace summary">
        <div>
          <span>Active courses</span><strong>{{ stats?.active_courses ?? '—' }}</strong
          ><small>Your teaching workspace</small>
        </div>
        <div>
          <span>Awaiting verification</span
          ><strong>{{ stats?.pending_verifications ?? '—' }}</strong
          ><small>Ready for your review</small>
        </div>
      </div>
    </header>

    <section class="dashboard-section">
      <div class="section-heading">
        <div>
          <h2>Core workflows</h2>
          <p>Everything you need for day-to-day assessment administration.</p>
        </div>
      </div>

      <AlertBox v-if="error" type="error" class="mb-4">{{ error }}</AlertBox>

      <div class="actions">
        <RouterLink class="action-card glass-panel" to="/courses">
          <span class="action-icon"><AppIcon name="courses" /></span>
          <div>
            <strong>Courses</strong>
            <span>Manage courses, students, assessments and scripts.</span>
          </div>
          <div class="action-meta">
            <span v-if="loading" class="skeleton-badge">...</span>
            <span v-else-if="stats" class="count-badge"> {{ stats.active_courses }} Active </span>
            <span class="action-arrow">→</span>
          </div>
        </RouterLink>

        <!-- Link includes query param for filtered list -->
        <RouterLink class="action-card glass-panel" to="/verification-queue">
          <span class="action-icon"><AppIcon name="verify" /></span>
          <div>
            <strong>Verification queue</strong>
            <span>Review student matches that still need lecturer confirmation.</span>
          </div>
          <div class="action-meta">
            <span v-if="loading" class="skeleton-badge">...</span>
            <span v-else-if="stats" class="count-badge warning-badge">
              {{ stats.pending_verifications }} Pending
            </span>
            <span class="action-arrow">→</span>
          </div>
        </RouterLink>
      </div>
    </section>
    <!-- Added glass-panel class here -->
    <section class="workflow-card glass-panel">
      <p class="page-eyebrow">PostGrade workflow</p>
      <div class="workflow-steps">
        <span>Upload</span>
        <i>→</i>
        <span>Recognise</span>
        <i>→</i>
        <span>Verify</span>
        <i>→</i>
        <span>Email script</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}

.dashboard-hero {
  display: flex;
  margin-bottom: 2rem;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  border-radius: var(--radius-lg);
  background: var(--hero-bg);
  background-color: #234b3d;
  color: #f3f7f4;
}

.dashboard-hero h1 {
  margin-bottom: 0.65rem;
  color: #f3f7f4;
  margin-top: 8px;
}

.page-eyebrow {
  color: var(--accent-green);
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.85rem;
}

.dashboard-subtitle,
.section-heading p {
  max-width: 650px;
  margin-bottom: 0;
  color: var(--text-secondary);
}
.dashboard-hero .page-eyebrow {
  color: #c8dfcc;
  margin-top: 0;
}
.dashboard-hero .dashboard-subtitle {
  color: #d0e0d6;
  font-size: 0.88rem;
  max-width: 470px;
}
.hero-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  flex-shrink: 0;
}
.hero-summary > div {
  background: #ffffff0e;
  border: 1px solid #ffffff1f;
  border-radius: 10px;
  padding: 18px;
  min-width: 150px;
}
.hero-summary span,
.hero-summary small {
  display: block;
  color: #d0e0d6;
  font-size: 0.68rem;
}
.hero-summary strong {
  display: block;
  color: #ffffff;
  font-size: 1.8rem;
  line-height: 1.5;
}
@media (max-width: 1200px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-summary {
    width: 100%;
  }
}
@media (max-width: 480px) {
  .dashboard-hero {
    padding: 24px;
  }
  .hero-summary > div {
    min-width: 0;
    padding: 12px;
  }
  .action-card {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .action-meta {
    grid-column: 2;
  }
}

.dashboard-section {
  margin-bottom: 2rem;
}

.section-heading {
  margin-bottom: 1.25rem;
}

.section-heading h2 {
  margin-bottom: 0.3rem;
  color: var(--text-primary);
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.action-card {
  display: grid;
  min-height: 150px;
  padding: 1.5rem;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 1.25rem;
  color: inherit;
  text-decoration: none;
  /* Override the default glass-panel transition to add the transform lift */
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.action-card:hover {
  border-color: var(--accent-green);
  background: var(--glass-bg-hover);
  transform: translateY(-3px);
}

.action-icon {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  /* Brand green styling for the icons */
  background: rgba(91, 166, 91, 0.15);
  color: var(--accent-green);
  border: 1px solid var(--glass-border-highlight);
  font-size: 1rem;
  font-weight: 700;
  place-items: center;
}

.action-card strong,
.action-card div > span {
  display: block;
}

.action-card strong {
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.action-card div > span {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.55;
}

.action-arrow {
  color: var(--text-muted);
  font-size: 1.2rem;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  color: var(--accent-green);
}

.workflow-card {
  margin-top: 2.5rem;
  padding: 1.5rem 1.75rem;
}

.workflow-card .page-eyebrow {
  margin-bottom: 1rem;
}

.workflow-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.workflow-steps span {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  background: var(--surface-header);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
}

.workflow-steps i {
  color: var(--text-muted);
  font-style: normal;
}

@media (max-width: 720px) {
  .dashboard {
    padding: 2.25rem 1rem 4rem;
  }

  .actions {
    grid-template-columns: 1fr;
  }
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.action-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
}

.count-badge {
  background: rgba(91, 166, 91, 0.15);
  color: var(--accent-green);
  border: 1px solid var(--glass-border-highlight);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.warning-badge {
  background: rgba(253, 224, 71, 0.15);
  color: var(--status-warning-text);
  border-color: rgba(253, 224, 71, 0.3);
}

.skeleton-badge {
  color: var(--text-muted);
  font-weight: bold;
  letter-spacing: 2px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
