<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchAssessment } from '@/services/assessments'
import type { Assessment } from '@/types/assessment'

const route = useRoute()
const assessmentId = Number(route.params.id)

const assessment = ref<Assessment | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    assessment.value = await fetchAssessment(assessmentId)
  } catch {
    error.value = 'Could not load assessment.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="assessment-detail-page">
    <p v-if="loading">Loading assessment…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="assessment">
      <RouterLink :to="`/courses/${assessment.course}`">← Back to course</RouterLink>

      <header>
        <h1>{{ assessment.name }}</h1>
        <p>{{ assessment.date }}</p>
      </header>

      <section class="panel">
        <dl>
          <div>
            <dt>Maximum mark</dt>
            <dd>{{ assessment.max_mark }}</dd>
          </div>
          <div>
            <dt>Course weight</dt>
            <dd>{{ assessment.weight }}%</dd>
          </div>
        </dl>
      </section>
    </template>
  </main>
</template>

<style scoped>
.assessment-detail-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

header {
  margin-top: 1.5rem;
}

.panel {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
}

dl {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

dt {
  font-weight: 700;
}

dd {
  margin: 0.25rem 0 0;
}

.error {
  color: #b00020;
}
</style>
