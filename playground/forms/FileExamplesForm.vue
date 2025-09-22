<script setup lang="ts">
import { createForm } from '@'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { values, isValid, isSubmitting, error, hasError, touch, submit, file } =
  createForm(
    {
      projectName: '',
      description: '',
      assets: null as File[] | null,
      coverImage: null as File | null,
    },
    (r, define) =>
      define({
        projectName: r
          .required(() => t('validation.required'))
          .minLength(3, () => t('validation.minLength', { count: 3 })),
        description: r.maxLength(200, () =>
          t('validation.maxLength', { count: 200 })
        ),
        assets: r
          .fileRequired(() => t('validation.fileRequired'))
          .fileCount(1, 5, () => t('validation.fileCount', { min: 1, max: 5 }))
          .fileSize(5 * 1024 * 1024, () =>
            t('validation.fileSize', { size: 5 })
          ),
        coverImage: [
          r.fileRequired(() => t('validation.fileRequired')),
          r.fileType(['.jpg', '.jpeg', '.png'], () => t('validation.fileType')),
          r.fileSize(3 * 1024 * 1024, () =>
            t('validation.fileSize', { size: 3 })
          ),
        ],
      }),
    {
      async onSubmit(values) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const result = {
          projectName: values.projectName,
          description: values.description || t('messages.noDescription'),
          assetCount: values.assets?.length || 0,
          coverImageName: values.coverImage?.name || t('messages.noImage'),
        }

        alert(
          `${t('messages.projectUploaded')}\n${JSON.stringify(result, null, 2)}`
        )
      },
    }
  )
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.file') }}
    </h2>

    <!-- Project name -->
    <div class="mb-4">
      <label
        for="projectName"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.projectName') }}
      </label>
      <input
        id="projectName"
        v-model="values.projectName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('projectName') }"
        @blur="touch('projectName')"
      />
      <span
        v-if="hasError('projectName')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('projectName') }}
      </span>
    </div>

    <!-- Description -->
    <div class="mb-4">
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
      />
      <span
        v-if="hasError('description')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('description') }}
      </span>
    </div>

    <!-- Assets -->
    <div class="mb-4">
      <label for="assets" class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('fields.projectFiles') }}
      </label>
      <input
        id="assets"
        type="file"
        multiple
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        @change="file.assets.handler"
      />
      <span v-if="hasError('assets')" class="block text-sm text-red-600 mt-1">
        {{ error('assets') }}
      </span>

      <div
        v-if="file.assets.files.value.length"
        class="mt-2 text-sm text-gray-700"
      >
        <p class="mb-1">
          {{
            t('file.selectedCount', { count: file.assets.files.value.length })
          }}
        </p>
        <ul class="list-disc list-inside space-y-1">
          <li v-for="f in file.assets.fileInfo.value" :key="f.name">
            {{ f.name }} ({{ f.formattedSize }})
          </li>
        </ul>
        <button
          type="button"
          class="mt-2 inline-flex items-center px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          @click="file.assets.clear()"
        >
          {{ t('file.clearAll') }}
        </button>
      </div>
    </div>

    <!-- Cover image -->
    <div class="mb-6">
      <label
        for="coverImage"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.coverImage') }}
      </label>
      <input
        id="coverImage"
        type="file"
        accept=".jpg,.jpeg,.png"
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        @change="file.coverImage.handler"
      />
      <span
        v-if="hasError('coverImage')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('coverImage') }}
      </span>

      <div
        v-if="file.coverImage.files.value.length"
        class="mt-2 text-sm text-gray-700"
      >
        <p>
          {{ file.coverImage.fileInfo.value[0]?.name }}
          ({{ file.coverImage.fileInfo.value[0]?.formattedSize }})
        </p>
        <button
          type="button"
          class="mt-2 inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          @click="file.coverImage.clear()"
        >
          {{ t('file.remove') }}
        </button>
      </div>
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
