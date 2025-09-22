<script setup lang="ts">
import { createForm, createRules } from '@'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

const {
  values,
  isValid,
  isSubmitting,
  error,
  hasError,
  touch,
  submit,
  addArrayItem,
  removeArrayItem,
  arrayPath,
} = createForm(
  {
    teamName: '',
    contacts: [{ name: '', email: '', role: '' }] as Array<{
      name: string
      email: string
      role: string
    }>,
  },
  computed(() => {
    const r = createRules()

    return {
      teamName: r
        .required(t('validation.required'))
        .minLength(3, t('validation.minLength', { count: 3 })),
      contacts: r.arrayMinLength(
        1,
        t('validation.arrayMinLength', { count: 1 })
      ),
      'contacts.*.name': r.required(t('validation.required')),
      'contacts.*.email': r
        .required(t('validation.required'))
        .email(t('validation.email')),
      'contacts.*.role': r.required(t('validation.required')),
    }
  }),
  {
    async onSubmit(formValues) {
      await new Promise(resolve => setTimeout(resolve, 800))
      alert('Team created!\n' + JSON.stringify(formValues, null, 2))
    },
  }
)

function addContact() {
  addArrayItem('contacts', { name: '', email: '', role: '' })
}

function removeContact(index: number) {
  removeArrayItem('contacts', index)
}
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.array') }}
    </h2>

    <!-- Team name -->
    <div class="mb-4">
      <label
        for="teamName"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.teamName') }}
      </label>
      <input
        id="teamName"
        v-model="values.teamName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('teamName') }"
        @blur="touch('teamName')"
      />
      <span v-if="hasError('teamName')" class="block text-sm text-red-600 mt-1">
        {{ error('teamName') }}
      </span>
    </div>

    <!-- Contacts array -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('contact.title') }}
      </label>
      <span v-if="hasError('contacts')" class="block text-sm text-red-600 mb-2">
        {{ error('contacts') }}
      </span>

      <div
        v-for="(contact, index) in values.contacts"
        :key="index"
        class="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50"
      >
        <h4 class="text-lg font-semibold text-gray-800 mb-4">
          {{ t('contact.item', { number: index + 1 }) }}
        </h4>

        <!-- Contact name -->
        <div class="mb-4">
          <label
            :for="`name-${index}`"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            {{ t('contact.name') }}
          </label>
          <input
            :id="`name-${index}`"
            v-model="contact.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-red-500 bg-red-50': hasError(
                arrayPath('contacts', index, 'name')
              ),
            }"
            @blur="touch(arrayPath('contacts', index, 'name'))"
          />
          <span
            v-if="hasError(arrayPath('contacts', index, 'name'))"
            class="block text-sm text-red-600 mt-1"
          >
            {{ error(arrayPath('contacts', index, 'name')) }}
          </span>
        </div>

        <!-- Contact email -->
        <div class="mb-4">
          <label
            :for="`email-${index}`"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            {{ t('contact.email') }}
          </label>
          <input
            :id="`email-${index}`"
            v-model="contact.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-red-500 bg-red-50': hasError(`contacts.${index}.email`),
            }"
            @blur="touch(`contacts.${index}.email`)"
          />
          <span
            v-if="hasError(`contacts.${index}.email`)"
            class="block text-sm text-red-600 mt-1"
          >
            {{ error(`contacts.${index}.email`) }}
          </span>
        </div>

        <!-- Contact role -->
        <div class="mb-4">
          <label
            :for="`role-${index}`"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            {{ t('contact.role') }}
          </label>
          <input
            :id="`role-${index}`"
            v-model="contact.role"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-red-500 bg-red-50': hasError(`contacts.${index}.role`),
            }"
            @blur="touch(`contacts.${index}.role`)"
          />
          <span
            v-if="hasError(`contacts.${index}.role`)"
            class="block text-sm text-red-600 mt-1"
          >
            {{ error(`contacts.${index}.role`) }}
          </span>
        </div>

        <!-- Remove button -->
        <button
          v-if="values.contacts.length > 1"
          type="button"
          class="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          @click="removeContact(index)"
        >
          {{ t('buttons.remove') }}
        </button>
      </div>

      <!-- Add button -->
      <button
        type="button"
        class="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
        @click="addContact"
      >
        {{ t('buttons.addContact') }}
      </button>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="!isValid || isSubmitting"
      class="w-full mt-6 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {{ isSubmitting ? t('buttons.submitting') : t('buttons.submit') }}
    </button>
  </form>
</template>
