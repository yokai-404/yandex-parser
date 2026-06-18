<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold">Yandex Parser</h1>
        <p class="text-gray-500 mt-2">
          Вход в систему
        </p>
      </div>

      <form @submit.prevent="submit">
        <div class="mb-4">
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div class="mb-4">
          <input
            v-model="password"
            type="password"
            placeholder="Пароль"
            class="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Войти
        </button>

        <div
          v-if="error"
          class="mt-4 text-red-600 text-sm text-center"
        >
          {{ error }}
        </div>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('admin@example.com')
const password = ref('password')

const submit = async () => {
    const ok = await auth.login(email.value, password.value)

    if (ok) {
        await router.push('/')
    }
}
</script>