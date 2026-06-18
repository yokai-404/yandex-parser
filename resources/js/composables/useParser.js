import api from '../api/axios'
import { ref, computed } from 'vue'


export function useParser() {

  const parseJobs = ref([])

  const parseLoading = ref(false)
  const parseError = ref('')
  const parseMessage = ref('')


  // Пагинация истории запусков
  const currentPage = ref(1)
  const jobsPerPage = 10


  const paginatedJobs = computed(() => {

    const start = (currentPage.value - 1) * jobsPerPage

    return parseJobs.value.slice(
      start,
      start + jobsPerPage
    )

  })


  const totalPages = computed(() => {

    return Math.ceil(
      parseJobs.value.length / jobsPerPage
    )

  })


  const nextPage = () => {

    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }

  }


  const prevPage = () => {

    if (currentPage.value > 1) {
      currentPage.value--
    }

  }


  const activeJob = computed(() => {

    return parseJobs.value.find(job =>
      [
        'pending',
        'running',
        'processing',
        'start'
      ].includes(job.status)
    )

  })


  const getJobStatusText = (status) => {

    switch (status) {

      case 'pending':
        return 'В процессе парсинга'

      case 'running':
        return 'Выполняется'

      case 'processing':
        return 'Обрабатывается'

      case 'start':
        return 'Ожидает запуска'

      case 'completed':
        return 'Парсинг завершен. Результат можете узнать в разделе "Данные"'

      case 'failed':
        return 'Ошибка'

      default:
        return 'Неизвестный статус'
    }

  }


  const getJobClass = (status) => {

    switch (status) {

      case 'completed':
        return 'job-success'

      case 'running':
      case 'pending':
      case 'processing':
      case 'start':
        return 'job-running'

      case 'failed':
        return 'job-failed'

      default:
        return ''
    }

  }


  const loadParseJobs = async () => {

    try {

      const { data } =
        await api.get('/api/parser/jobs')


      parseJobs.value = data.data ?? []

      // после обновления списка возвращаемся на первую страницу
      currentPage.value = 1


    } catch (e) {

      console.error(e)

      parseError.value =
        'Не удалось загрузить задачи'

    }

  }


  const runParser = async () => {

    parseLoading.value = true

    parseError.value = ''
    parseMessage.value = ''


    try {

      const { data } =
        await api.post('/api/parser/run')


      parseMessage.value =
        data.message || 'Парсинг запущен'


      await loadParseJobs()


    } catch (e) {

      console.error(e)


      parseError.value =
        e.response?.data?.message ||
        'Не удалось запустить парсинг'


    } finally {

      parseLoading.value = false

    }

  }


  return {

    parseJobs,

    paginatedJobs,

    currentPage,

    totalPages,

    nextPage,

    prevPage,

    parseLoading,

    parseError,

    parseMessage,

    activeJob,

    getJobClass,

    getJobStatusText,

    loadParseJobs,

    runParser,

  }

}