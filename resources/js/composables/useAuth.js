import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export function useAuth() {
  const router = useRouter()
  const auth = useAuthStore()

  const user = computed(() => auth.user)

  const logout = async () => {
    try {
      await auth.logout()
      await router.push('/login')
    } catch (e) {
      console.error(e)
    }
  }

  return {
    user,
    logout,
  }
}