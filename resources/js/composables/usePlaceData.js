import api from '../api/axios'
import { ref } from 'vue'

export function usePlaceData() {
  const place = ref(null)

  const reviews = ref([])

  const reviewsMeta = ref({
    current_page: 1,
    last_page: 1,
  })

  const reviewsPage = ref(1)

  const dataLoading = ref(false)
  const reviewsLoading = ref(false)
  const dataError = ref('')

  const formatDate = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  const loadPlace = async () => {
    dataLoading.value = true
    dataError.value = ''

    try {
      const response = await api.get('/api/yandex/place')

      place.value =
        response.data?.data ?? null
    } catch (e) {
      console.error(e)

      place.value = null

      dataError.value =
        e.response?.data?.message ||
        'Не удалось загрузить данные организации'
    } finally {
      dataLoading.value = false
    }
  }

  const loadReviews = async (page = 1) => {
    reviewsLoading.value = true

    try {
      const response = await api.get(
        '/api/yandex/place/reviews',
        {
          params: { page }
        }
      )

      const paginator =
        response.data?.data

      reviews.value =
        paginator?.data ?? []

      reviewsMeta.value = {
        current_page:
          paginator?.current_page ?? 1,

        last_page:
          paginator?.last_page ?? 1,
      }
    } catch (e) {
      console.error(e)

      reviews.value = []

      dataError.value =
        e.response?.data?.message ||
        'Не удалось загрузить отзывы'
    } finally {
      reviewsLoading.value = false
    }
  }

  const changeReviewsPage = async (page) => {
    if (
      page < 1 ||
      page > reviewsMeta.value.last_page
    ) {
      return
    }

    reviewsPage.value = page

    await loadReviews(page)
  }

  const loadDataTab = async () => {
    await loadPlace()

    if (place.value) {
      await loadReviews(1)
    }
  }

  return {
    place,
    reviews,
    reviewsMeta,
    reviewsPage,
    dataLoading,
    reviewsLoading,
    dataError,
    formatDate,
    loadPlace,
    loadReviews,
    changeReviewsPage,
    loadDataTab,
  }
}