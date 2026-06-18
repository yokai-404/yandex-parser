import { ref } from 'vue'
import api from '../api/axios'

export function useSettings() {
  const mapUrl = ref('')

  const saveMessage = ref('')
  const saveError = ref(false)
  const saveLoading = ref(false)

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/settings')
      mapUrl.value = response.data?.data?.yandex_url ?? ''
    } catch (e) {
      console.error(e)
    }
  }

  const saveSettings = async () => {
    saveMessage.value = ''
    saveError.value = false

    if (!mapUrl.value.trim()) {
      saveError.value = true
      saveMessage.value = 'Введите ссылку на Яндекс.Карты'
      return
    }

    saveLoading.value = true

    try {
      await api.post('/api/settings', {
        yandex_url: mapUrl.value.trim(),
      })

      saveMessage.value = 'Настройки успешно сохранены'
    } catch (e) {
      console.error(e)

      saveError.value = true

      if (e.response?.status === 422) {
        const errors = e.response.data.errors

        saveMessage.value =
          errors?.yandex_url?.[0] ||
          errors?.message?.[0] ||
          'Проверьте введённые данные'
      } else {
        saveMessage.value =
          e.response?.data?.message ||
          'Ошибка сохранения'
      }
    } finally {
      saveLoading.value = false
    }
  }

  return {
    mapUrl,
    saveMessage,
    saveError,
    saveLoading,
    loadSettings,
    saveSettings,
  }
}