<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { availableLocales } from './i18n'

import OriginalForm from './forms/OriginalForm.vue'
import FileExamplesForm from './forms/FileExamplesForm.vue'
import DateExamplesForm from './forms/DateExamplesForm.vue'
import ArrayExamplesForm from './forms/ArrayExamplesForm.vue'
import ObjectExampleForm from './forms/ObjectExampleForm.vue'
import PresetShareForm from './forms/PresetShareForm.vue'
import StressTestForm from './forms/StressTestForm.vue'

type DemoKey =
  | 'original'
  | 'files'
  | 'dates'
  | 'arrays'
  | 'nested'
  | 'presetshare'
  | 'stress'

const { t, locale } = useI18n()

const demos: Record<
  DemoKey,
  { labelKey: string; descKey: string; icon: string; component: any }
> = {
  original: {
    labelKey: 'forms.original',
    descKey: 'forms.originalDesc',
    icon: '👤',
    component: OriginalForm,
  },
  files: {
    labelKey: 'forms.file',
    descKey: 'forms.fileDesc',
    icon: '📁',
    component: FileExamplesForm,
  },
  dates: {
    labelKey: 'forms.date',
    descKey: 'forms.dateDesc',
    icon: '📅',
    component: DateExamplesForm,
  },
  arrays: {
    labelKey: 'forms.array',
    descKey: 'forms.arrayDesc',
    icon: '📝',
    component: ArrayExamplesForm,
  },
  nested: {
    labelKey: 'forms.nested',
    descKey: 'forms.nestedDesc',
    icon: '🏗️',
    component: ObjectExampleForm,
  },
  presetshare: {
    labelKey: 'forms.presetshare',
    descKey: 'forms.presetshareDesc',
    icon: '🎵',
    component: PresetShareForm,
  },
  stress: {
    labelKey: 'forms.stress',
    descKey: 'forms.stressDesc',
    icon: '🔥',
    component: StressTestForm,
  },
}

const demoKeys = Object.keys(demos) as DemoKey[]

function getDemoFromHash(): DemoKey {
  const hash = window.location.hash.replace('#', '')
  return demoKeys.includes(hash as DemoKey) ? (hash as DemoKey) : 'original'
}

const current = ref<DemoKey>(getDemoFromHash())
const CurrentComp = computed(() => demos[current.value].component)

watch(current, key => {
  window.location.hash = key
})

onMounted(() => {
  window.addEventListener('hashchange', () => {
    current.value = getDemoFromHash()
  })
})

function setLocale(newLocale: string) {
  locale.value = newLocale
}
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col"
  >
    <!-- Header -->
    <header class="p-8">
      <div class="max-w-4xl mx-auto text-center mb-8">
        <div
          class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"
        >
          <h1 class="text-4xl font-bold text-slate-900">
            {{ t('title') }}
          </h1>

          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-slate-700">
              {{ t('language') }}:
            </label>
            <select
              :value="locale"
              class="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              @change="setLocale(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="lang in availableLocales"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.name }}
              </option>
            </select>
          </div>
        </div>

        <p class="text-lg text-slate-600">
          {{ t('subtitle') }}
        </p>
      </div>

      <!-- Demo buttons -->
      <nav
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
      >
        <button
          v-for="(cfg, key) in demos"
          :key="key"
          class="group p-4 rounded-xl shadow-md border-2 transition-all duration-200 bg-white text-left hover:shadow-lg hover:border-blue-200"
          :class="{
            'border-blue-500 ring-2 ring-blue-100 bg-blue-50': key === current,
            'border-transparent': key !== current,
          }"
          @click="current = key as DemoKey"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl">{{ cfg.icon }}</span>
            <div class="flex-1">
              <span
                class="block font-semibold text-slate-900 group-hover:text-blue-700"
              >
                {{ t(cfg.labelKey) }}
              </span>
              <span class="block text-sm text-slate-600 mt-1">
                {{ t(cfg.descKey) }}
              </span>
            </div>
          </div>
        </button>
      </nav>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex justify-center p-6">
      <div
        class="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
      >
        <component :is="CurrentComp" />
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 py-6 text-center">
      <p class="text-sm text-slate-500">
        <a
          href="https://github.com/Sakhnovkrg/vue-form-validator"
          rel="noopener"
          class="text-blue-600 hover:underline"
        >
          {{ t('footer.viewSource') }}
        </a>
      </p>
    </footer>
  </div>
</template>
