import api from '../api/axios'
import { ref } from 'vue'

export function useHistory() {

  const historyItems = ref([])

  const historyLoading = ref(false)

  const historyError = ref('')

  const loadHistory = async () => {

    historyLoading.value = true
    historyError.value = ''

    try {

      const { data } = await api.get('/api/history')

      historyItems.value = data.data ?? []

    } catch (e) {

      console.error(e)

      historyError.value =
        e.response?.data?.message ||
        'Не удалось загрузить историю'

    } finally {

      historyLoading.value = false
    }
  }

  return {
    historyItems,
    historyLoading,
    historyError,
    loadHistory,
  }
}