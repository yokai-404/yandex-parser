import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'


const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login,
            meta: { guest: true },
        },
        {
            path: '/',
            name: 'dashboard',
            component: Dashboard,
            meta: { auth: true },
        },
       
    ],
})

router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.initialized) {
        await auth.init()
    }

    if (to.meta.auth && !auth.isAuthenticated) {
        return { name: 'login' }
    }

    if (to.meta.guest && auth.isAuthenticated) {
        return { name: 'dashboard' }
    }

    return true
})

export default router