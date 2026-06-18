<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        Yandex Parser
      </div>

      <div class="user-info">
        <div class="user-email">
          С возвращением!<br>
          {{ user?.email }}
        </div>
      </div>

      <nav>
        <button
          class="menu-item"
          :class="{ active: currentTab === 'dashboard' }"
          @click="currentTab = 'dashboard'"
        >
          Главная
        </button>

        <button
          class="menu-item"
          :class="{ active: currentTab === 'settings' }"
          @click="currentTab = 'settings'"
        >
          Настройки
        </button>

        <button
          class="menu-item"
          :class="{ active: currentTab === 'parser' }"
          @click="currentTab = 'parser'"
        >
          Парсинг
        </button>

                <button
          class="menu-item"
          :class="{ active: currentTab === 'data' }"
          @click="currentTab = 'data'"
        >
          Данные
        </button>

        <button
          class="menu-item"
          :class="{ active: currentTab === 'history' }"
          @click="currentTab = 'history'"
        >
          История
        </button>
      </nav>

      <button class="logout-btn" @click="logout">
        Выход
      </button>
    </aside>

    <main class="content">
      <!-- Главная -->
      <div v-if="currentTab === 'dashboard'">
        <h1>Главная</h1>
        <p>Добро пожаловать в систему Yandex Parser.</p>
      </div>

      <!-- Настройки -->
      <div v-if="currentTab === 'settings'">
        <h1>Настройки</h1>

        <div class="form-group">
          <label class="label">
            Ссылка на объект Яндекс Карт
          </label>

          <input
            v-model="mapUrl"
            type="text"
            placeholder="https://yandex.ru/maps/org/..."
            class="input"
          />
        </div>

        <button
          @click="saveSettings"
          class="save-btn"
          :disabled="saveLoading"
        >
          {{ saveLoading ? 'Сохранение...' : 'Сохранить' }}
        </button>

        <p
          v-if="saveMessage"
          :class="saveError ? 'error-text' : 'success-text'"
        >
          {{ saveMessage }}
        </p>
      </div>

<!-- Данные -->
<div v-if="currentTab === 'data'">

  <h1>Данные организации</h1>

  <!-- Идёт парсинг -->
  <div
    v-if="activeJob"
    class="processing-card"
  >
    <h2>Обработка запроса</h2>

    <p>
      Выполняется парсинг отзывов Яндекс.Карт...
    </p>

    <div style="margin-top:10px;">
      <strong>Статус:</strong>
      {{ getJobStatusText(activeJob.status) }}
    </div>


  </div>

  <!-- Ошибка загрузки -->
  <div
    v-else-if="dataError"
    class="error-text"
  >
    {{ dataError }}
  </div>

  <!-- Загрузка -->
  <div
    v-else-if="dataLoading"
    class="muted"
  >
    Загружаем данные...
  </div>

  <!-- Данные организации -->
  <template v-else>

    <div
      v-if="place"
      class="place-card"
    >
      <h2 class="place-title">
        {{ place.title }}
      </h2>

      <div class="stats-grid">

        <div class="stat-card">
          <div class="stat-label">
            Средний рейтинг
          </div>

          <div class="stat-value">
            {{ place.rating ?? '—' }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">
            Количество оценок
          </div>

          <div class="stat-value">
            {{ place.ratings_count ?? '—' }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">
            Количество отзывов
          </div>

          <div class="stat-value">
            {{ place.reviews_count ?? '—' }}
          </div>
        </div>

      </div>

      <div
        v-if="place.synced_at"
        class="muted"
      >
        Обновлено:
        {{ formatDate(place.synced_at) }}
      </div>
    </div>

    <!-- Отзывы -->
    <div
      v-if="reviews.length"
      class="reviews-block"
    >
      <div class="reviews-header">
        <h2>Отзывы</h2>

        <div class="muted">
          Страница
          {{ reviewsMeta.current_page }}
          из
          {{ reviewsMeta.last_page }}
        </div>
      </div>

      <div
        v-for="review in reviews"
        :key="review.id"
        class="review-card"
      >
        <div class="review-top">
          <strong>
            {{ review.author || 'Без имени' }}
          </strong>

          <span class="review-rating">
            ★ {{ review.rating ?? '—' }}
          </span>
        </div>

        <div class="review-date">
          {{
            review.published_at
              ? formatDate(review.published_at)
              : '—'
          }}
        </div>

        <div class="review-text">
          {{ review.text || '—' }}
        </div>
      </div>

      <div class="pagination">

        <button
          class="page-btn"
          @click="changeReviewsPage(reviewsMeta.current_page - 1)"
          :disabled="
            reviewsMeta.current_page <= 1 ||
            reviewsLoading
          "
        >
          Назад
        </button>

        <span class="muted">
          {{ reviewsMeta.current_page }}
          /
          {{ reviewsMeta.last_page }}
        </span>

        <button
          class="page-btn"
          @click="changeReviewsPage(reviewsMeta.current_page + 1)"
          :disabled="
            reviewsMeta.current_page >= reviewsMeta.last_page ||
            reviewsLoading
          "
        >
          Вперёд
        </button>

      </div>
    </div>

    <div
      v-else-if="place"
      class="muted"
    >
      Отзывы пока не загружены.
    </div>

  </template>

</div>

 <!-- Парсинг -->
<div v-if="currentTab === 'parser'">

  <h1>Парсинг</h1>

  <p>
    Запуск парсинга для сохранённой ссылки Яндекс.Карт.
  </p>


  <button
    class="save-btn"
    @click="runParser"
    :disabled="parseLoading"
  >
    {{ parseLoading ? 'Запуск...' : 'Запустить парсинг' }}
  </button>


  <p
    v-if="parseMessage"
    class="success-text"
  >
    {{ parseMessage }}
  </p>


  <p
    v-if="parseError"
    class="error-text"
  >
    {{ parseError }}
  </p>


  <div style="margin-top:30px;">


    <div
      v-if="!parseJobs.length"
      style="margin-top:12px;"
    >
      Пока запусков нет.
    </div>


    <div
      v-for="job in paginatedJobs"
      :key="job.id"
      class="job-card"
      :class="getJobClass(job.status)"
    >

      <div>
        <strong>ID:</strong>
        {{ job.id }}
      </div>


      <div>
        <strong>Статус:</strong>
        {{ getJobStatusText(job.status) }}
      </div>


      <div>
        <strong>URL:</strong>
        {{ job.yandex_url }}
      </div>


      <div
        v-if="job.error_message"
        class="error-text"
        style="margin-top:10px;"
      >
        <strong>Ошибка:</strong>
        {{ job.error_message }}
      </div>


    </div>


    <!-- Пагинация -->
    <div
      v-if="totalPages > 1"
      style="margin-top:20px; display:flex; align-items:center; gap:15px;"
    >
      <button
        class="save-btn"
        @click="prevPage"
        :disabled="currentPage === 1"
      >
        Назад
      </button>

      <span>
        Страница {{ currentPage }} из {{ totalPages }}
      </span>

      <button
        class="save-btn"
        @click="nextPage"
        :disabled="currentPage === totalPages"
      >
        Вперёд
      </button>
    </div>
  </div>
</div>
      
      <!-- История -->
      <div v-if="currentTab === 'history'">

        <h1 style="margin-bottom: 20px;">История парсинга</h1>

        <div
          v-if="historyLoading"
          class="muted"
        >
          Загружаем историю...
        </div>
        <div
          v-else-if="historyError"
          class="error-text"
        >
          {{ historyError }}
        </div>
        <div
          v-else-if="!historyItems.length"
          class="muted"
        >
          История пока пуста.
        </div>
        <div
          v-for="item in historyItems"
          :key="item.id"
          class="history-card"
        >
          <div class="history-top">

            <div class="history-title">
              {{ item.title || 'Без названия' }}
            </div>

            <div class="history-date">
              {{ formatDate(item.synced_at) }}
            </div>

          </div>

          <div class="history-stats">
            <div class="history-stat">
              ⭐ Рейтинг:
              <strong>
                {{ item.rating ?? '—' }}
              </strong>
            </div>
            <div class="history-stat">
              👍 Оценки:
              <strong>
                {{ item.ratings_count ?? 0 }}
              </strong>
            </div>
            <div class="history-stat">
              💬 Отзывы:
              <strong>
                {{ item.reviews_count ?? 0 }}
              </strong>
            </div>
          </div>

          <div class="history-url">
            {{ item.source_url }}
          </div>

          <div class="history-status success">
            ✓ Парсинг завершён успешно
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<!-- JS -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'

import { useAuth } from '../composables/useAuth'
const { user, logout } = useAuth()

import { useSettings } from '../composables/useSettings'
const {
  mapUrl,
  saveMessage,
  saveError,
  saveLoading,
  loadSettings,
  saveSettings
} = useSettings()
const currentTab = ref('settings')


import { useParser } from '../composables/useParser'
const {
  paginatedJobs,
  currentPage,
  totalPages,
  nextPage,
  prevPage,
  parseJobs,
  parseLoading,
  parseError,
  parseMessage,
  getJobClass,
  getJobStatusText,
  runParser,
  activeJob,
  loadParseJobs,
} = useParser()

import { usePlaceData } from '../composables/usePlaceData'
const {
  place,
  reviews,
  reviewsMeta,
  dataLoading,
  reviewsLoading,
  dataError,
  formatDate,
  changeReviewsPage,
  loadDataTab
} = usePlaceData()

import { useHistory } from '../composables/useHistory'
const {
  
  historyItems,
  historyLoading,
  historyError,
  loadHistory,
} = useHistory()


let jobsInterval = null
watch(
  activeJob,
  async (job, oldJob) => {

    // появилась активная задача
    if (job) {
      return
    }


    // задача закончилась
    if (!job && oldJob) {

      if (currentTab.value === 'data') {

        await loadDataTab()

      }

    }

  }
)
watch(currentTab, async (tab) => {
  if (tab === 'data') {
    await loadDataTab()
  }

  if (tab === 'parser') {
    await loadParseJobs()
  }

  if (tab === 'history') {
    await loadHistory()
  }
})

watch(parseJobs, async () => {

  const job = parseJobs.value[0]

  if (
    currentTab.value === 'data' &&
    job?.status === 'completed'
  ) {

    await loadDataTab()

  }

},
{
  deep:true
})

onMounted(async () => {
  await loadSettings()
  await loadParseJobs()

  jobsInterval = setInterval(async () => {

    const oldStatus = activeJob.value?.status

    await loadParseJobs()

    const newStatus = activeJob.value?.status


    if (
      oldStatus &&
      !newStatus &&
      currentTab.value === 'data'
    ) {
      await loadDataTab()
    }


  },60000)
})


</script>


<!-- CSS -->
<style scoped>
.job-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid #d1d5db;
  background: white;
}

.job-success {
  border-color: #22c55e;
  background: #f0fdf4;
}

.job-running {
  border-color: #f59e0b;
  background: #fffbeb;
}

.job-failed {
  border-color: #ef4444;
  background: #fef2f2;
}
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #1f2937;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.logo {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 30px;
}

.user-info {
  margin-bottom: 20px;
  padding: 10px;
  background: #111827;
  border-radius: 8px;
}

.user-email {
  font-size: 13px;
  color: #ffffff;
  word-break: break-all;
}

.menu-item {
  width: 100%;
  text-align: left;
  background: transparent;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: 0.2s;
}

.menu-item:hover {
  background: #374151;
}

.menu-item.active {
  background: #2563eb;
}

.logout-btn {
  margin-top: auto;
  background: #dc2626;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.logout-btn:hover {
  background: #b91c1c;
}

.content {
  flex: 1;
  padding: 40px;
  background: #f5f7fb;
}

.form-group {
  margin-top: 20px;
  max-width: 800px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
}

.save-btn {
  margin-top: 15px;
  padding: 12px 24px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.save-btn:hover {
  background: #1d4ed8;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-text {
  margin-top: 12px;
  color: #16a34a;
  font-weight: 600;
}

.error-text {
  margin-top: 12px;
  color: #dc2626;
  font-weight: 600;
}

.muted {
  color: #6b7280;
  margin-top: 12px;
}

.place-card {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.place-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 16px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
}

.reviews-block {
  margin-top: 28px;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
}

.review-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.review-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.review-rating {
  font-weight: 700;
}

.review-date {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.review-text {
  margin-top: 10px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.pagination {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-btn {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.processing-box {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: #fffbeb;
  border: 2px solid #f59e0b;
}

.processing-card {
  margin-top: 20px;
  padding: 20px;
  border-radius: 10px;
  background: #fff7cc;
  border: 1px solid #facc15;
}

.history-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 5px solid #22c55e;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

.history-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.history-title {
  font-size: 18px;
  font-weight: 600;
}

.history-date {
  color: #777;
  font-size: 14px;
}

.history-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.history-stat {
  background: #f7f7f7;
  padding: 8px 12px;
  border-radius: 8px;
}

.history-url {
  word-break: break-all;
  color: #666;
  font-size: 13px;
  margin-bottom: 10px;
}

.history-status {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.history-status.success {
  background: #dcfce7;
  color: #15803d;
}
</style>