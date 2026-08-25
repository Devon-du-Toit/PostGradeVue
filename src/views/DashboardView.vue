<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <main class="dashboard">
    <header class="dashboard-hero">
      <div>
        <p class="page-eyebrow">Workspace</p>
        <h1>Good to see you{{ authStore.user?.first_name ? `, ${authStore.user.first_name}` : '' }}.</h1>
        <p class="dashboard-subtitle">
          Manage courses, review submission matches and keep assessment results up to date.
        </p>
      </div>
    </header>

    <section class="dashboard-section">
      <div class="section-heading">
        <div>
          <h2>Core workflows</h2>
          <p>Everything you need for day-to-day assessment administration.</p>
        </div>
      </div>

      <div class="actions">
        <RouterLink class="action-card" to="/courses">
          <span class="action-icon">C</span>
          <div>
            <strong>Courses</strong>
            <span>Manage courses, students, assessments and gradebooks.</span>
          </div>
          <span class="action-arrow">→</span>
        </RouterLink>

        <RouterLink class="action-card" to="/verification-queue">
          <span class="action-icon">V</span>
          <div>
            <strong>Verification queue</strong>
            <span>Review OCR matches that still need lecturer confirmation.</span>
          </div>
          <span class="action-arrow">→</span>
        </RouterLink>
      </div>
    </section>

    <section class="workflow-card">
      <p class="page-eyebrow">PostGrade workflow</p>
      <div class="workflow-steps">
        <span>Upload</span>
        <i>→</i>
        <span>Recognise</span>
        <i>→</i>
        <span>Verify</span>
        <i>→</i>
        <span>Mark</span>
        <i>→</i>
        <span>Gradebook</span>
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
  margin-bottom: 3.25rem;
  align-items: flex-end;
  justify-content: space-between;
}

.dashboard-hero h1 {
  margin-bottom: 0.65rem;
}

.dashboard-subtitle,
.section-heading p {
  max-width: 650px;
  margin-bottom: 0;
  color: var(--pg-muted);
}

.dashboard-section {
  margin-bottom: 2rem;
}

.section-heading {
  margin-bottom: 1.25rem;
}

.section-heading h2 {
  margin-bottom: 0.3rem;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.action-card {
  display: grid;
  min-height: 150px;
  padding: 1.5rem;
  border: 1px solid var(--pg-border);
  border-radius: 12px;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 1rem;
  background: #fff;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(23, 35, 60, 0.025);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.action-card:hover {
  border-color: #c9d7f0;
  color: inherit;
  box-shadow: var(--pg-shadow);
  transform: translateY(-2px);
}

.action-icon {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--pg-blue-soft);
  color: var(--pg-blue);
  font-size: 0.86rem;
  font-weight: 700;
  place-items: center;
}

.action-card strong,
.action-card div > span {
  display: block;
}

.action-card strong {
  margin-bottom: 0.4rem;
  color: var(--pg-navy);
  font-size: 1.05rem;
}

.action-card div > span {
  color: var(--pg-muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.action-arrow {
  color: #9ba6b8;
  font-size: 1.2rem;
}

.workflow-card {
  margin-top: 2.5rem;
  padding: 1.35rem 1.5rem;
  border: 1px solid var(--pg-border);
  border-radius: 12px;
  background: #fff;
}

.workflow-card .page-eyebrow {
  margin-bottom: 0.8rem;
}

.workflow-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem;
}

.workflow-steps span {
  color: #435069;
  font-size: 0.85rem;
  font-weight: 600;
}

.workflow-steps i {
  color: #b0b9c8;
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
</style>
