import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '@/views/LoginView.vue'
import PasswordRecoveryView from '@/views/PasswordRecoveryView.vue'
import DashboardView from '@/views/DashboardView.vue'
import CoursesView from '@/views/CoursesView.vue'
import CourseDetailView from '@/views/CourseDetailView.vue'
import AssessmentDetailView from '@/views/AssessmentDetailView.vue'
import VerificationQueueView from '@/views/VerificationQueueView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/forgot-password', name: 'forgot-password', component: PasswordRecoveryView },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: PasswordRecoveryView,
      props: { mode: 'confirm' },
    },
    {
      path: '/',
      name: 'home',
      redirect: () => (localStorage.getItem('accessToken') ? '/dashboard' : '/login'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: LoginView,
      props: { mode: 'signup' },
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/verification-queue',
      name: 'verification-queue',
      component: VerificationQueueView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/courses',
      name: 'courses',
      component: CoursesView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/courses/:id',
      name: 'course-detail',
      component: CourseDetailView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/assessments/:id',
      name: 'assessment-detail',
      component: AssessmentDetailView,
      meta: {
        requiresAuth: true,
      },
    },
  ],
})

router.beforeEach((to) => {
  const isAuthenticated = Boolean(localStorage.getItem('accessToken'))

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
