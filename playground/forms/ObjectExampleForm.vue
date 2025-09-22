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
  objectPath,
} = createForm(
  {
    name: '',
    address: {
      street: '',
      city: '',
      zipCode: '',
    },
    profile: {
      bio: '',
      website: '',
    },
  },
  computed(() => {
    const r = createRules()

    return {
      name: r.required(t('validation.required')),
      'address.street': r.required(t('validation.required')),
      'address.city': r.required(t('validation.required')),
      'address.zipCode': r
        .required(t('validation.required'))
        .regex(/^\d{5}$/, t('validation.zipCodeFormat')),
      'profile.bio': r.maxLength(
        200,
        t('validation.maxLength', { count: 200 })
      ),
      'profile.website': r.regex(
        /^https?:\/\/.+/,
        t('validation.websiteFormat')
      ),
    }
  }),
  {
    async onSubmit(formValues) {
      await new Promise(resolve => setTimeout(resolve, 800))
      alert(
        t('messages.profileSaved') + '\n' + JSON.stringify(formValues, null, 2)
      )
    },
  }
)
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.nested') }}
    </h2>

    <!-- Name -->
    <div class="mb-4">
      <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('fields.name') }}
      </label>
      <input
        id="name"
        v-model="values.name"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('name') }"
        @blur="touch('name')"
      />
      <span v-if="hasError('name')" class="block text-sm text-red-600 mt-1">
        {{ error('name') }}
      </span>
    </div>

    <!-- Address -->
    <fieldset class="mb-6 border border-gray-200 rounded-lg p-4">
      <legend class="px-2 text-lg font-semibold text-gray-800">
        {{ t('fields.address') }}
      </legend>

      <div class="mb-4 mt-2">
        <label
          for="street"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          {{ t('fields.street') }}
        </label>
        <input
          id="street"
          v-model="values.address.street"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{
            'border-red-500 bg-red-50': hasError(
              objectPath('address', 'street')
            ),
          }"
          @blur="touch(objectPath('address', 'street'))"
        />
        <span
          v-if="hasError(objectPath('address', 'street'))"
          class="block text-sm text-red-600 mt-1"
        >
          {{ error(objectPath('address', 'street')) }}
        </span>
      </div>

      <div class="mb-4">
        <label for="city" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('fields.city') }}
        </label>
        <input
          id="city"
          v-model="values.address.city"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500 bg-red-50': hasError('address.city') }"
          @blur="touch('address.city')"
        />
        <span
          v-if="hasError('address.city')"
          class="block text-sm text-red-600 mt-1"
        >
          {{ error('address.city') }}
        </span>
      </div>

      <div>
        <label
          for="zipCode"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          {{ t('fields.zipCode') }}
        </label>
        <input
          id="zipCode"
          v-model="values.address.zipCode"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500 bg-red-50': hasError('address.zipCode') }"
          @blur="touch('address.zipCode')"
        />
        <span
          v-if="hasError('address.zipCode')"
          class="block text-sm text-red-600 mt-1"
        >
          {{ error('address.zipCode') }}
        </span>
      </div>
    </fieldset>

    <!-- Profile -->
    <fieldset class="mb-6 border border-gray-200 rounded-lg p-4">
      <legend class="px-2 text-lg font-semibold text-gray-800">
        {{ t('fields.profile') }}
      </legend>

      <div class="mb-4 mt-2">
        <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('fields.bio') }}
        </label>
        <textarea
          id="bio"
          v-model="values.profile.bio"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{
            'border-red-500 bg-red-50': hasError(objectPath('profile', 'bio')),
          }"
          @blur="touch(objectPath('profile', 'bio'))"
        ></textarea>
        <span
          v-if="hasError(objectPath('profile', 'bio'))"
          class="block text-sm text-red-600 mt-1"
        >
          {{ error(objectPath('profile', 'bio')) }}
        </span>
      </div>

      <div>
        <label
          for="website"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          {{ t('fields.website') }}
        </label>
        <input
          id="website"
          v-model="values.profile.website"
          type="url"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500 bg-red-50': hasError('profile.website') }"
          @blur="touch('profile.website')"
        />
        <span
          v-if="hasError('profile.website')"
          class="block text-sm text-red-600 mt-1"
        >
          {{ error('profile.website') }}
        </span>
      </div>
    </fieldset>

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
