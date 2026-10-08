<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import '@/assets/ui-proposals.css'
const route = useRoute()
const router = useRouter()
const concepts = [
  {
    id: 'campus',
    name: 'Campus',
    description: 'Confident purple. Clear hierarchy. A familiar academic workspace.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Warm paper tones. Generous space. A calmer approach to administration.',
  },
  {
    id: 'console',
    name: 'Console',
    description: 'Dark surfaces. Compact workflows. Built for focused review sessions.',
  },
]
const style = ref(concepts.find((item) => item.id === route.query.style)?.id ?? 'campus')
const concept = computed(() => concepts.find((item) => item.id === style.value) ?? concepts[0]!)
const page = ref('dashboard')
const nav = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'courses', label: 'Courses', icon: 'courses' },
  { id: 'verification', label: 'Verification', icon: 'verify' },
  { id: 'login', label: 'Sign-in preview', icon: 'logout' },
]
const search = ref('')
const courses = [
  {
    code: 'CMPG313',
    title: 'Advanced Databases',
    students: 124,
    assessments: 3,
    color: 'purple',
    progress: 82,
  },
  {
    code: 'CMPG323',
    title: 'IT Developments',
    students: 96,
    assessments: 2,
    color: 'orange',
    progress: 64,
  },
  {
    code: 'CMPG211',
    title: 'Object-Oriented Programming',
    students: 158,
    assessments: 4,
    color: 'blue',
    progress: 91,
  },
]
const filtered = computed(() =>
  courses.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(search.value.toLowerCase())),
)
const reviews = ref([
  {
    id: 1,
    student: 'Alex Mokoena',
    number: '202600101',
    course: 'CMPG313',
    assessment: 'Semester test 2',
    issue: 'Student match',
    verified: false,
  },
  {
    id: 2,
    student: 'Jamie Smith',
    number: '202600102',
    course: 'CMPG323',
    assessment: 'Class test 3',
    issue: 'Page check',
    verified: false,
  },
  {
    id: 3,
    student: 'Taylor Naidoo',
    number: '202600103',
    course: 'CMPG211',
    assessment: 'Semester test 1',
    issue: 'Student match',
    verified: false,
  },
])
const remaining = computed(() => reviews.value.filter((item) => !item.verified).length)
const active = ref<number | null>(null)
const selected = computed(() => reviews.value.find((item) => item.id === active.value))
const notice = ref('')
const chooseStyle = (id: string) => {
  style.value = id
  void router.replace({ query: { ...route.query, style: id } })
}
const go = (id: string) => {
  page.value = id
  search.value = ''
  notice.value = ''
  active.value = null
}
const openCourse = (code: string) => {
  go('courses')
  search.value = code
}
const toggleSignup = () => {
  signup.value = !signup.value
  notice.value = ''
  password.value = ''
  confirm.value = ''
}
const confirmReview = () => {
  if (selected.value) selected.value.verified = true
  active.value = null
  notice.value = 'Sample match confirmed. This preview does not update student records.'
}
const signup = ref(false)
const rules = ref(false)
const email = ref('')
const password = ref('')
const confirm = ref('')
const submitPreview = () => {
  if (signup.value && (password.value.length < 8 || !/[^\p{L}\p{N}\s]/u.test(password.value))) {
    notice.value = 'Use at least 8 characters and include a special character.'
    return
  }
  if (signup.value && password.value !== confirm.value) {
    notice.value = 'Passwords do not match.'
    return
  }
  password.value = ''
  confirm.value = ''
  notice.value = 'Form preview complete. No account was created or signed in.'
}
</script>
<template>
  <div class="ui-draft" :data-concept="style">
    <header class="draft-toolbar">
      <div class="draft-title">
        <span class="draft-dot"></span><strong>Design proposals</strong
        ><span class="draft-label">LOCAL DRAFT</span>
      </div>
      <div class="concept-picker" role="group" aria-label="Choose a UI style">
        <button
          v-for="(item, index) in concepts"
          :key="item.id"
          :aria-pressed="style === item.id"
          @click="chooseStyle(item.id)"
        >
          <span>0{{ index + 1 }}</span
          >{{ item.name }}
        </button>
      </div>
      <RouterLink class="exit-preview" to="/">Open PostGrade ↗</RouterLink>
    </header>
    <div class="design-caption">
      <strong>{{ concept.name }}</strong
      ><span>{{ concept.description }}</span
      ><span>Sample data · Interactive preview</span>
    </div>
    <div class="preview-shell">
      <aside class="draft-sidebar">
        <a href="#" class="draft-brand" @click.prevent="go('dashboard')"
          ><img src="/postgradeLogo.jpg" alt="" /><span
            >PostGrade<small>LECTURER WORKSPACE</small></span
          ></a
        >
        <div class="workspace-name">
          <span class="workspace-mark">PG</span>
          <div>Academic workspace<small>Semester 2 · 2026</small></div>
        </div>
        <p class="nav-label">WORKSPACE</p>
        <nav aria-label="Preview navigation">
          <button
            v-for="item in nav"
            :key="item.id"
            :aria-current="page === item.id ? 'page' : undefined"
            @click="go(item.id)"
          >
            <AppIcon :name="item.icon" /><span>{{ item.label }}</span
            ><span v-if="item.id === 'verification'" class="nav-count">{{ remaining }}</span>
          </button>
        </nav>
        <div class="sidebar-bottom">
          <div class="help-card">
            <AppIcon name="courses" /><strong>A little less admin.</strong>
            <p>A little more teaching.</p>
          </div>
          <div class="profile">
            <span class="draft-avatar">SL</span>
            <div>Sam Lecturer<small>Lecturer · Sample profile</small></div>
          </div>
        </div>
      </aside>
      <div class="draft-content">
        <header class="draft-topbar">
          <div>
            <span class="breadcrumb">Workspace /</span
            ><strong>{{ nav.find((item) => item.id === page)?.label }}</strong>
          </div>
          <span class="semester-pill">Semester 2, 2026</span
          ><span class="draft-avatar" aria-label="Sample lecturer profile">SL</span>
        </header>
        <main class="draft-main">
          <p v-if="notice" class="preview-notice" role="status">{{ notice }}</p>
          <template v-if="page === 'dashboard'"
            ><section class="welcome">
              <div>
                <p class="eyebrow">YOUR TEACHING, IN FOCUS</p>
                <h1>More clarity.<br /><em>Less paperwork.</em></h1>
                <p class="welcome-copy">
                  Welcome back, Sam. Your courses and scripts,<br />together in one considered
                  workspace.
                </p>
                <button class="primary" @click="go('verification')">
                  Review pending scripts <AppIcon name="arrow" />
                </button>
              </div>
              <div class="hero-art" aria-hidden="true">
                <div class="art-orbit"></div>
                <div class="art-sheet">
                  <span class="art-label">POSTGRADE</span>
                  <div class="art-lines"><i></i><i></i><i></i></div>
                  <div class="art-bubbles">
                    <span
                      v-for="n in 12"
                      :key="n"
                      :class="{ filled: [2, 5, 7, 12].includes(n) }"
                    ></span>
                  </div>
                  <div class="art-check">✓</div>
                </div>
                <span class="floating-label"><AppIcon name="verify" /> Ready for your review</span>
              </div>
            </section>
            <section class="metrics" aria-label="Sample workspace statistics">
              <button @click="go('courses')">
                <span>Active courses<AppIcon name="courses" /></span
                ><strong>3<small>This semester</small></strong
                ><span class="metric-foot">Your teaching workspace ↗</span></button
              ><button @click="go('verification')">
                <span>Needs your review<AppIcon name="verify" /></span
                ><strong>{{ remaining }}<small>Scripts to verify</small></strong
                ><span class="metric-foot attention">Lecturer confirmation needed ↗</span>
              </button>
              <div>
                <span>Scripts returned<AppIcon name="mail" /></span
                ><strong>248<small>Across all courses</small></strong
                ><span class="metric-foot"
                  >Verified and delivered <span class="status-dot"></span
                ></span>
              </div>
            </section>
            <div class="dashboard-columns">
              <section>
                <div class="section-title">
                  <div>
                    <p class="eyebrow">KEEP THINGS MOVING</p>
                    <h2>Your courses</h2>
                  </div>
                  <button class="text-button" @click="go('courses')">View all ↗</button>
                </div>
                <div class="course-list">
                  <button
                    v-for="course in courses"
                    :key="course.code"
                    class="course-row"
                    @click="openCourse(course.code)"
                  >
                    <span class="monogram" :class="course.color">{{ course.code.slice(-3) }}</span
                    ><span class="course-info"
                      ><strong>{{ course.title }}</strong
                      ><small>{{ course.code }} · {{ course.students }} students</small></span
                    ><span class="course-assessments">{{ course.assessments }} assessments</span
                    ><AppIcon name="arrow" />
                  </button>
                </div>
              </section>
              <section class="next-step">
                <span class="next-icon"><AppIcon name="verify" /></span>
                <p class="eyebrow">NEXT UP</p>
                <h2>A quick check.<br />A confident return.</h2>
                <p>
                  {{ remaining }} sample scripts are waiting for your confirmation. Review a match
                  before returning it.
                </p>
                <button class="secondary" @click="go('verification')">
                  Open verification <AppIcon name="arrow" />
                </button>
              </section></div
          ></template>
          <template v-else-if="page === 'courses'"
            ><div class="page-heading">
              <div>
                <p class="eyebrow">YOUR TEACHING WORKSPACE</p>
                <h1>Courses</h1>
                <p>One place for students, assessments and scripts.</p>
              </div>
              <button
                class="primary"
                @click="
                  notice =
                    'Course creation is available in the live PostGrade app. This draft uses sample courses.'
                "
              >
                + Add course
              </button>
            </div>
            <label class="search-field"
              ><AppIcon name="courses" /><span class="sr-only">Search courses</span
              ><input
                v-model="search"
                placeholder="Search by course code or name"
                type="search"
              /><span>{{ filtered.length }} courses</span></label
            >
            <div class="course-grid">
              <article v-for="course in filtered" :key="course.code" class="course-card">
                <div class="card-top">
                  <span class="monogram" :class="course.color">{{ course.code.slice(-3) }}</span
                  ><span class="pill">Active</span>
                </div>
                <p class="eyebrow">{{ course.code }}</p>
                <h2>{{ course.title }}</h2>
                <p>{{ course.students }} students · {{ course.assessments }} assessments</p>
                <div class="progress-label">
                  <span>Scripts returned</span><strong>{{ course.progress }}%</strong>
                </div>
                <meter
                  min="0"
                  max="100"
                  :value="course.progress"
                  :aria-label="`${course.title}: scripts returned`"
                ></meter
                ><button class="secondary" @click="go('verification')">
                  Review course scripts <AppIcon name="arrow" />
                </button>
              </article>
            </div>
            <div v-if="!filtered.length" class="empty-state">
              <h2>No courses found</h2>
              <p>Try another code or course name.</p>
              <button class="secondary" @click="search = ''">Clear search</button>
            </div></template
          >
          <template v-else-if="page === 'verification'"
            ><div class="page-heading">
              <div>
                <p class="eyebrow">A HUMAN CHECK, BEFORE SEND</p>
                <h1>Verification</h1>
                <p>Confirm the right script reaches the right student.</p>
              </div>
              <span class="queue-total">{{ remaining }} pending</span>
            </div>
            <section class="queue-panel">
              <div class="queue-heading">
                <h2>Scripts awaiting review</h2>
                <span class="pill">Sample assessment data</span>
              </div>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Assessment</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span class="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="review in reviews" :key="review.id">
                      <td>
                        <strong>{{ review.student }}</strong
                        ><small>{{ review.number }}</small>
                      </td>
                      <td>
                        <strong>{{ review.course }}</strong
                        ><small>{{ review.assessment }}</small>
                      </td>
                      <td>
                        <span class="pill" :class="review.verified ? 'verified' : 'pending'">{{
                          review.verified ? 'Verified' : review.issue
                        }}</span>
                      </td>
                      <td>
                        <button
                          class="secondary"
                          :disabled="review.verified"
                          @click="active = review.id"
                        >
                          {{ review.verified ? 'Confirmed' : 'Review match' }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            <p class="privacy-note">
              <AppIcon name="verify" /> Every return starts with a verified student match.
            </p>
            <section v-if="selected" class="review-detail" aria-label="Selected sample match">
              <p class="eyebrow">SAMPLE MATCH REVIEW</p>
              <h2>{{ selected.student }}</h2>
              <p>{{ selected.number }} · {{ selected.course }} · {{ selected.assessment }}</p>
              <p>
                In the live workflow, the scanned script and student details appear here for
                comparison.
              </p>
              <div class="review-actions">
                <button class="secondary" @click="active = null">Cancel</button
                ><button class="primary" @click="confirmReview">
                  Confirm sample match <AppIcon name="verify" />
                </button>
              </div></section
          ></template>
          <section v-else class="signin-layout">
            <div class="signin-story">
              <p class="eyebrow">POSTGRADE / ACADEMIC WORKSPACE</p>
              <h1>Your time belongs<br />to <em>teaching.</em></h1>
              <p>
                From scanned scripts to verified returns.<br />Make room for the work that matters.
              </p>
              <div class="signin-decoration" aria-hidden="true">
                <span>Recognise.</span><span>Verify.</span><span>Return.</span>
              </div>
            </div>
            <form class="signin-card" @submit.prevent="submitPreview">
              <span class="pill">FORM PREVIEW</span>
              <h2>{{ signup ? 'Create your account' : 'Welcome back' }}</h2>
              <p>
                {{
                  signup ? 'Start your lecturer workspace.' : 'Sign in to your lecturer workspace.'
                }}
              </p>
              <template v-if="signup"
                ><label for="draft-name">Full name</label
                ><input
                  id="draft-name"
                  autocomplete="name"
                  placeholder="Sam Lecturer"
                  required /></template
              ><label for="draft-email">Email address</label
              ><input
                id="draft-email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@mynwu.ac.za"
                required
              />
              <div class="password-row">
                <label for="draft-password">Password</label
                ><button
                  v-if="signup"
                  type="button"
                  class="rule-button"
                  aria-label="Show password rules"
                  :aria-expanded="rules"
                  aria-controls="draft-password-rules"
                  @click="rules = !rules"
                >
                  ?
                </button>
              </div>
              <input
                id="draft-password"
                v-model="password"
                type="password"
                :autocomplete="signup ? 'new-password' : 'current-password'"
                :aria-describedby="signup && rules ? 'draft-password-rules' : undefined"
                placeholder="Enter your password"
                required
              />
              <p v-if="signup && rules" id="draft-password-rules">
                Use at least 8 characters and a special character, such as !, @ or #. Avoid common
                passwords and personal details.
              </p>
              <template v-if="signup"
                ><label for="draft-confirm">Confirm password</label
                ><input
                  id="draft-confirm"
                  v-model="confirm"
                  type="password"
                  autocomplete="new-password"
                  required /></template
              ><button class="primary" type="submit">
                {{ signup ? 'Preview create account' : 'Preview sign in' }} <AppIcon name="arrow" />
              </button>
              <p class="signin-switch">
                {{ signup ? 'Already have an account?' : 'New to PostGrade?' }}
                <button type="button" @click="toggleSignup">
                  {{ signup ? 'Sign in' : 'Create an account' }}
                </button>
              </p>
              <small>Preview only. Please use sample credentials.</small>
            </form>
          </section>
          <footer class="draft-footer">
            <span>PostGrade · Thoughtfully organised.</span
            ><span>{{ concept.name }} · Draft proposal</span>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>
