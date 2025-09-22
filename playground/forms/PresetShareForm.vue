<script setup lang="ts">
import { computed } from 'vue'
import { createForm, createRules } from '@'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const availableTags = [
  { value: 'dnb', label: '🎧 Drum & Bass' },
  { value: 'bass', label: '🧨 Bass' },
  { value: 'synth', label: '🎹 Synth' },
  { value: 'lead', label: '🎺 Lead' },
  { value: 'pad', label: '🌌 Pad' },
  { value: 'pluck', label: '✨ Pluck' },
  { value: 'arp', label: '🔁 Arp' },
  { value: 'fx', label: '🎛 FX' },
]

const synthConfig = {
  serum: { extensions: ['.fxp'], accept: '.fxp', hintKey: 'serum' },
  vital: { extensions: ['.vital'], accept: '.vital', hintKey: 'vital' },
} as const

type SynthKey = keyof typeof synthConfig
const isSynthKey = (value: string): value is SynthKey => value in synthConfig

type PresetFormValues = {
  name: string
  synthesizer: string
  description: string
  tags: string[]
  presetFile: File | null
}

const {
  error,
  hasError,
  touch,
  file,
  validateField,
  clearCache,
  val,
  toggleArrayItem,
  isValid,
  isSubmitting,
  submit,
  arrayIncludes,
} = createForm(
  {
    name: '',
    synthesizer: '',
    description: '',
    tags: [] as string[],
    presetFile: null,
  },
  computed(() => {
    const r = createRules()

    return {
      name: r
        .required(t('validation.presetNameRequired'))
        .minLength(3, t('validation.minLength', { count: 3 })),
      synthesizer: r.required(t('validation.synthesizerRequired')),
      description: r.maxLength(500, t('validation.maxLength', { count: 500 })),
      tags: r.arrayRequired(t('validation.tagRequired')),
      presetFile: [
        r.fileRequired(t('validation.presetFileRequired')),
        r.custom((file: File | null, values: Record<string, any>) => {
          if (!file) return true
          const formValues = values as PresetFormValues
          const synthesizer = formValues.synthesizer as SynthKey
          if (!synthesizer) return true
          const config = synthConfig[synthesizer]
          if (!config) return true
          const fileName = file.name.toLowerCase()
          return config.extensions.some(ext =>
            fileName.endsWith(ext.toLowerCase())
          )
        }, t('validation.invalidFileFormat')),
      ],
    }
  }),
  {
    async onSubmit(values) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert(t('preset.successMessage', { name: values.name }))
    },
  }
)

const selectedSynthConfig = computed<(typeof synthConfig)[SynthKey] | null>(
  () => {
    const synth = val.synthesizer
    return isSynthKey(synth) ? synthConfig[synth] : null
  }
)

const synthHint = computed(() =>
  selectedSynthConfig.value?.hintKey
    ? t(`fileHints.${selectedSynthConfig.value.hintKey}`)
    : ''
)
const acceptAttribute = computed(() => selectedSynthConfig.value?.accept ?? '')

async function handleSynthesizerChange() {
  clearCache('presetFile')
  touch('synthesizer')
  await validateField('presetFile')
}

async function handleTagChange(_e: Event, tagValue: string) {
  await toggleArrayItem('tags', tagValue)
}

const isTagChecked = (tagValue: string) => arrayIncludes('tags', tagValue)
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.presetshare') }}
    </h2>

    <!-- Название -->
    <div class="mb-4">
      <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('fields.presetName') }} *
      </label>
      <input
        id="name"
        v-model="val.name"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('name') }"
        @blur="touch('name')"
      />
      <span v-if="hasError('name')" class="block text-sm text-red-600 mt-1">
        {{ error('name') }}
      </span>
    </div>

    <!-- Синтезатор -->
    <div class="mb-4">
      <label
        for="synthesizer"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.synthesizer') }} *
      </label>
      <select
        id="synthesizer"
        v-model="val.synthesizer"
        class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('synthesizer') }"
        @blur="touch('synthesizer')"
        @change="handleSynthesizerChange"
      >
        <option value="">{{ t('placeholders.selectSynthesizer') }}</option>
        <option value="serum">{{ t('synthesizers.serum') }}</option>
        <option value="vital">{{ t('synthesizers.vital') }}</option>
      </select>
      <span
        v-if="hasError('synthesizer')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('synthesizer') }}
      </span>
    </div>

    <!-- Описание -->
    <div class="mb-4">
      <label
        for="description"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.description') }}
      </label>
      <textarea
        id="description"
        v-model="val.description"
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

    <!-- Теги -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2"
        >{{ t('fields.tags') }} *</label
      >
      <div class="flex flex-wrap gap-3">
        <label
          v-for="tag in availableTags"
          :key="tag.value"
          class="flex items-center gap-2 text-sm cursor-pointer select-none"
        >
          <input
            type="checkbox"
            :value="tag.value"
            :checked="isTagChecked(tag.value)"
            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            @change="handleTagChange($event, tag.value)"
          />
          {{ t(`tags.${tag.value}`) }}
        </label>
      </div>
      <span v-if="hasError('tags')" class="block text-sm text-red-600 mt-1">
        {{ error('tags') }}
      </span>
    </div>

    <!-- Файл пресета -->
    <div class="mb-6">
      <label
        for="preset-file"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.presetFile') }} *
        <span class="text-gray-500 text-sm font-normal">
          ({{
            val.synthesizer ? synthHint : t('placeholders.firstSelectSynth')
          }})
        </span>
      </label>
      <input
        id="preset-file"
        type="file"
        :accept="acceptAttribute || undefined"
        :disabled="!val.synthesizer"
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        @change="file.presetFile.handler"
      />
      <div v-if="file.presetFile.files.value.length" class="mt-3 space-y-2">
        <div
          v-for="(info, idx) in file.presetFile.fileInfo.value"
          :key="`${info.name}-${idx}`"
          class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
        >
          <span>🎵 {{ info.name }} ({{ info.formattedSize }})</span>
          <button
            type="button"
            class="inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            @click="file.presetFile.clear()"
          >
            ×
          </button>
        </div>
      </div>
      <span
        v-if="hasError('presetFile')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('presetFile') }}
      </span>
    </div>

    <!-- Кнопка отправки -->
    <button
      type="submit"
      :disabled="!isValid || isSubmitting"
      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {{ isSubmitting ? t('buttons.submitting') : t('buttons.submitPreset') }}
    </button>
  </form>
</template>
