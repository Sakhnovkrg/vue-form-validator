<script setup lang="ts">
import { createForm, createRules } from '@'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { values, isValid, isSubmitting, error, hasError, touch, submit } =
  createForm(
    {
      eventName: '',
      category: '',
      startDate: '',
      endDate: '',
      description: '',
    },
    computed(() => {
      const r = createRules()

      return {
        eventName: r
          .required(t('validation.required'))
          .minLength(3, t('validation.minLength', { count: 3 })),
        category: r.required(t('validation.required')),
        startDate: r.required(t('validation.required')),
        endDate: r
          .required(t('validation.required'))
          .dateAfter(
            'startDate',
            t('validation.dateAfter', { field: t('fields.startDate') })
          ),
        description: r.maxLength(
          500,
          t('validation.maxLength', { count: 500 })
        ),
      }
    }),
    {
      async onSubmit(formValues) {
        await new Promise(resolve => setTimeout(resolve, 600))
        alert('Event created!\n' + JSON.stringify(formValues, null, 2))
      },
    }
  )

const categories = [
  'Conference',
  'Workshop',
  'Meeting',
  'Social Event',
  'Training',
  'Other',
]

const durationDays = computed(() => {
  if (!values.value.startDate || !values.value.endDate) return null
  const start = new Date(values.value.startDate)
  const end = new Date(values.value.endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : null
})
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.date') }}
    </h2>

    <!-- Event name -->
    <div class="mb-4">
      <label
        for="eventName"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.eventName') }}
      </label>
      <input
        id="eventName"
        v-model="values.eventName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('eventName') }"
        @blur="touch('eventName')"
      />
      <span
        v-if="hasError('eventName')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('eventName') }}
      </span>
    </div>

    <!-- Category -->
    <div class="mb-4">
      <label
        for="category"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.category') }}
      </label>
      <select
        id="category"
        v-model="values.category"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('category') }"
        @blur="touch('category')"
      >
        <option value="">{{ t('placeholders.selectCategory') }}</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
      <span v-if="hasError('category')" class="block text-sm text-red-600 mt-1">
        {{ error('category') }}
      </span>
    </div>

    <!-- Start date -->
    <div class="mb-4">
      <label
        for="startDate"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.startDate') }}
      </label>
      <input
        id="startDate"
        v-model="values.startDate"
        type="date"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('startDate') }"
        @blur="touch('startDate')"
      />
      <span
        v-if="hasError('startDate')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('startDate') }}
      </span>
    </div>

    <!-- End date -->
    <div class="mb-4">
      <label for="endDate" class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('fields.endDate') }}
      </label>
      <input
        id="endDate"
        v-model="values.endDate"
        type="date"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('endDate') }"
        @blur="touch('endDate')"
      />
      <span v-if="hasError('endDate')" class="block text-sm text-red-600 mt-1">
        {{ error('endDate') }}
      </span>
    </div>

    <!-- Duration -->
    <div v-if="durationDays" class="mb-4 text-sm text-gray-700">
      {{ t('event.duration') }}:
      {{ durationDays }}
      {{ durationDays === 1 ? t('event.day') : t('event.days') }}
    </div>

    <!-- Description -->
    <div class="mb-6">
      <label
        for="description"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.description') }}
      </label>
      <textarea
        id="description"
        v-model="values.description"
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('description') }"
        @blur="touch('description')"
      ></textarea>
      <span
        v-if="hasError('description')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('description') }}
      </span>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="!isValid || isSubmitting"
      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {{ isSubmitting ? t('buttons.submitting') : t('buttons.submit') }}
    </button>
  </form>
</template>
