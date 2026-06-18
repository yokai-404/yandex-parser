import { defineStore } from 'pinia'
import api from '../api/axios'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || null,
        user: null,
        loading: false,
        error: null,
        initialized: false,
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
    },

    actions: {
        setToken(token) {
            this.token = token
            localStorage.setItem('token', token)
            api.defaults.headers.common.Authorization = `Bearer ${token}`
        },

        clearToken() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
            delete api.defaults.headers.common.Authorization
        },

        async login(email, password) {
            this.loading = true
            this.error = null

            try {
                const { data } = await api.post('/api/login', {
                    email,
                    password,
                })

                this.setToken(data.token)
                this.user = data.user

                return true
            } catch (error) {
                this.error =
                    error?.response?.data?.message ||
                    'Не удалось войти в систему'

                return false
            } finally {
                this.loading = false
            }
        },

        async fetchUser() {
            if (!this.token) return null

            try {
                const { data } = await api.get('/api/user')
                this.user = data
                return data
            } catch {
                await this.logout(false)
                return null
            }
        },

        async logout(callApi = true) {
            if (callApi && this.token) {
                try {
                    await api.post('/api/logout')
                } catch {
                    // ignore
                }
            }

            this.clearToken()
        },

        async init() {
            if (this.initialized) return

            this.initialized = true

            if (this.token) {
                await this.fetchUser()
            }
        },
    },
})