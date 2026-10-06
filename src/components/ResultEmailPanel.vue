<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import {
  approveAssessmentEmails,
  approveResultEmail,
  fetchResultEmails,
  retryResultEmail,
} from '@/services/resultEmails'
import type { ResultEmail, ResultEmailStatus } from '@/types/resultEmail'

const props = defineProps<{ assessmentId: number; refreshKey: number }>()
const emails = ref<ResultEmail[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')
const duplicateConfirmed = ref<Record<number, boolean>>({})
const awaiting = computed(() =>
  emails.value.filter((email) => email.is_current && email.status === 'awaiting_approval'),
)
const labels: Record<ResultEmailStatus, string> = {
  awaiting_approval: 'Awaiting approval',
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  superseded: 'Superseded',
}
const reasons: Record<string, string> = {
  missing_recipient: 'No email address. Add the student’s address, then retry.',
  recipient_refused: 'The mail server rejected the address. Check it before retrying.',
  provider_error: 'The mail provider could not deliver this email.',
  delivery_unknown: 'Delivery is uncertain. The student may already have received this email.',
}
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let disposed = false

const load = async () => {
  if (disposed) return
  clearTimeout(timer)
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  try {
    const records = await fetchResultEmails(props.assessmentId, current.signal)
    if (disposed || current.signal.aborted) return
    emails.value = records
    error.value = ''
  } catch {
    if (!disposed && !current.signal.aborted)
      error.value = 'Could not refresh email delivery status. Your saved marks are unaffected.'
  } finally {
    if (!disposed && controller === current) {
      loading.value = false
      controller = undefined
      if (
        emails.value.some(
          (email) => email.is_current && ['queued', 'sending'].includes(email.status),
        )
      ) {
        timer = setTimeout(() => void load(), 3000)
      }
    }
  }
}

const act = async (action: () => Promise<unknown>, success: string) => {
  if (busy.value) return
  busy.value = true
  clearTimeout(timer)
  controller?.abort()
  controller = undefined
  loading.value = false
  error.value = ''
  message.value = ''
  try {
    await action()
    duplicateConfirmed.value = {}
    message.value = success
    await load()
  } catch (cause) {
    const detail = (cause as { response?: { data?: { detail?: string } } }).response?.data?.detail
    error.value =
      detail || 'Could not update email delivery. Refresh its status before trying again.'
  } finally {
    busy.value = false
  }
}

watch(
  () => [props.assessmentId, props.refreshKey],
  () => void load(),
  { immediate: true },
)
onUnmounted(() => {
  disposed = true
  clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <section class="glass-panel email-panel" aria-labelledby="result-emails-heading">
    <h2 id="result-emails-heading">Result email delivery</h2>
    <p>
      Saving a mark and sending its email are separate steps. These previews show the exact stored
      messages. Emails contain result text; scripts are not attached.
    </p>
    <button type="button" class="btn-text" :disabled="loading || busy" @click="load">
      Refresh delivery status
    </button>
    <button
      v-if="awaiting.length"
      type="button"
      class="btn-primary"
      :disabled="loading || busy"
      @click="
        act(() => approveAssessmentEmails(assessmentId), 'Approved emails are queued for delivery.')
      "
    >
      Approve {{ awaiting.length }} current emails
    </button>
    <p v-if="loading && !emails.length">Loading email delivery status…</p>
    <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
    <AlertBox v-if="message" type="success">{{ message }}</AlertBox>
    <p v-if="!loading && !error && !emails.length">
      No email deliveries scheduled. Direct gradebook entries do not schedule a first email.
    </p>
    <article v-for="email in emails" :key="email.id" class="email-record" :data-email-id="email.id">
      <h3>{{ email.student_number }} · Result version {{ email.result_version }}</h3>
      <p class="delivery-status">
        {{ labels[email.status] }}<span v-if="!email.is_current"> · Previous mark version</span>
      </p>
      <p v-if="email.failure_reason" class="failure-reason">
        {{ reasons[email.failure_reason] || email.failure_reason }}
      </p>
      <p v-if="email.status === 'queued' || email.status === 'sending'">
        Delivery attempts: {{ email.attempts }} / {{ email.max_attempts }}
      </p>
      <p v-if="email.sent_at">Sent: {{ new Date(email.sent_at).toLocaleString() }}</p>
      <details>
        <summary>Preview stored email</summary>
        <p><strong>To:</strong> {{ email.recipient || 'No email address' }}</p>
        <p><strong>Subject:</strong> {{ email.subject }}</p>
        <pre>{{ email.body }}</pre>
      </details>
      <button
        v-if="email.is_current && email.status === 'awaiting_approval'"
        class="btn-primary"
        type="button"
        :disabled="loading || busy"
        @click="act(() => approveResultEmail(email.id), 'Email approved and queued for delivery.')"
      >
        Approve email
      </button>
      <template v-if="email.is_current && email.status === 'failed'">
        <label v-if="email.failure_reason === 'delivery_unknown'" class="duplicate-confirmation">
          <input v-model="duplicateConfirmed[email.id]" type="checkbox" />
          I understand this may send a duplicate email and confirm sending it again.
        </label>
        <button
          class="btn-primary"
          type="button"
          :disabled="
            loading ||
            busy ||
            (email.failure_reason === 'delivery_unknown' && !duplicateConfirmed[email.id])
          "
          @click="
            act(
              () => retryResultEmail(email.id, Boolean(duplicateConfirmed[email.id])),
              'Retry queued. Delivery has not yet been confirmed.',
            )
          "
        >
          {{
            email.failure_reason === 'delivery_unknown' ? 'Confirm resend' : 'Retry failed email'
          }}
        </button>
      </template>
    </article>
  </section>
</template>

<style scoped>
.email-panel {
  padding: 2rem;
  margin-bottom: 2rem;
}
.email-panel > p {
  color: var(--text-secondary);
}
.email-panel button {
  margin: 0.75rem 0.75rem 0.75rem 0;
}
.btn-text {
  color: var(--accent-green);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.email-record {
  border-top: 1px solid var(--table-divider);
  padding: 1rem 0;
}
.delivery-status {
  font-weight: 600;
}
.failure-reason {
  color: var(--status-error-text);
}
summary {
  color: var(--accent-green);
  cursor: pointer;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--surface-inset);
  padding: 1rem;
  border-radius: var(--radius-md);
}
.duplicate-confirmation {
  display: block;
  margin: 1rem 0;
}
</style>
