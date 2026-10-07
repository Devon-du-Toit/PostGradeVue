<script setup lang="ts">
import { reactive, ref } from 'vue'
import { addCourseStudent } from '@/services/students'
import AlertBox from '@/components/AlertBox.vue'

const props = defineProps<{ courseId: number }>()
const emit = defineEmits<{ added: [] }>()
const emptyForm = () => ({ student_number: '', first_name: '', last_name: '', email: '' })
const form = reactive(emptyForm())
const busy = ref(false)
const error = ref('')
const message = ref('')
const usedExistingDetails = ref(false)
const submit = async () => {
  if (busy.value) return
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const response = await addCourseStudent(props.courseId, { ...form })
    Object.assign(form, emptyForm())
    usedExistingDetails.value = Boolean(response.mismatches?.length)
    message.value = usedExistingDetails.value
      ? 'Student added using their existing saved name and email.'
      : 'Student added to this course.'
    emit('added')
  } catch (cause) {
    const data = (
      cause as {
        response?: { data?: { message?: string; detail?: string; errors?: { message: string }[] } }
      }
    ).response?.data
    error.value =
      data?.errors?.map((item) => item.message).join(' ') ||
      data?.detail ||
      data?.message ||
      (cause instanceof Error ? cause.message : '') ||
      'Could not add the student. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <form class="add-student-form" @submit.prevent="submit">
    <fieldset :disabled="busy">
      <legend>Add a student</legend>
      <div class="student-fields">
        <label
          >Student number<input
            v-model.trim="form.student_number"
            class="glass-input"
            required
            maxlength="50"
            placeholder="12345678"
        /></label>
        <label
          >First name<input
            v-model.trim="form.first_name"
            class="glass-input"
            required
            maxlength="100"
            autocomplete="given-name"
        /></label>
        <label
          >Last name<input
            v-model.trim="form.last_name"
            class="glass-input"
            required
            maxlength="100"
            autocomplete="family-name"
        /></label>
        <label
          >Email<input
            v-model.trim="form.email"
            class="glass-input"
            required
            type="email"
            maxlength="254"
            autocomplete="email"
        /></label>
      </div>
    </fieldset>
    <div class="student-form-actions">
      <button class="btn-primary" type="submit" :disabled="busy">
        {{ busy ? 'Adding…' : 'Add student' }}
      </button>
    </div>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <AlertBox v-if="message" :type="usedExistingDetails ? 'warning' : 'success'">{{
      message
    }}</AlertBox>
  </form>
</template>
<style scoped>
fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
legend {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.student-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
input {
  width: 100%;
}
.student-form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.add-student-form {
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--table-divider);
}
@media (max-width: 600px) {
  .student-fields {
    grid-template-columns: 1fr;
  }
}
</style>
