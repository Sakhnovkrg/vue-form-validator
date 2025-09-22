<script setup lang="ts">
import { createForm, createRules } from '@'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

async function checkUsernameUnique(username: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100))
  return username.toLowerCase() !== 'admin'
}

const {
  values,
  isValid,
  isSubmitting,
  isDirty,
  error,
  hasError,
  validating,
  touch,
  submit,
} = createForm(
  {
    username: '',
    email: '',
    password: '',
    confirm: '',
    accountType: '' as '' | 'personal' | 'company',
    companyName: '',
  },
  computed(() => {
    const r = createRules()

    return {
      username: r
        .required(t('validation.required'))
        .minLength(3, t('validation.minLength'))
        .regex(/^[a-zA-Z0-9_]+$/, t('validation.usernameFormat'))
        .remote(checkUsernameUnique, t('validation.remote')),
      email: r.required(t('validation.required')).email(t('validation.email')),
      password: r
        .required(t('validation.required'))
        .minLength(8, t('validation.minLength', { count: 8 }))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t('validation.passwordStrength')
        ),
      confirm: r
        .required(t('validation.required'))
        .sameAs('password', t('validation.sameAs')),
      accountType: r.required(t('validation.required')),
      companyName: r
        .requiredIf(
          'accountType',
          'company',
          t('validation.companyNameRequired')
        )
        .minLength(2, t('validation.minLength', { count: 2 }))
        .maxLength(100, t('validation.companyNameMaxLength')),
    }
  }),
  {
    async onSubmit(formValues) {
      await new Promise(resolve => setTimeout(resolve, 800))
      alert(
        t('messages.registrationSuccess') +
          '\n' +
          JSON.stringify(formValues, null, 2)
      )
    },
  }
)
</script>

<template>
  <form class="mx-auto p-6" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('forms.original') }}
    </h2>

    <div class="mb-4">
      <label
        for="username"
        class="block text-sm font-medium text-gray-700 mb-2"
        >{{ t('fields.username') }}</label
      >
      <input
        id="username"
        v-model="values.username"
        type="text"
        :placeholder="t('placeholders.enterUsername')"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('username') }"
        @blur="touch('username')"
      />
      <span
        v-if="hasError('username')"
        class="block text-sm text-red-600 mt-1"
        >{{ error('username') }}</span
      >
      <span
        v-else-if="validating('username')"
        class="block text-sm text-blue-600 mt-1"
        >{{ t('validation.checking') }}...</span
      >
    </div>

    <div class="mb-4">
      <label for="email" class="block text-sm font-medium text-gray-700 mb-2">{{
        t('fields.email')
      }}</label>
      <input
        id="email"
        v-model="values.email"
        type="email"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('email') }"
        @blur="touch('email')"
      />
      <span v-if="hasError('email')" class="block text-sm text-red-600 mt-1">{{
        error('email')
      }}</span>
    </div>

    <div class="mb-4">
      <label
        for="accountType"
        class="block text-sm font-medium text-gray-700 mb-2"
        >{{ t('fields.accountType') }}</label
      >
      <select
        id="accountType"
        v-model="values.accountType"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('accountType') }"
        @blur="touch('accountType')"
      >
        <option value="">{{ t('placeholders.selectAccountType') }}</option>
        <option value="personal">{{ t('account.types.personal') }}</option>
        <option value="company">{{ t('account.types.company') }}</option>
      </select>
      <span
        v-if="hasError('accountType')"
        class="block text-sm text-red-600 mt-1"
        >{{ error('accountType') }}</span
      >
    </div>

    <div v-if="values.accountType === 'company'" class="mb-4">
      <label
        for="companyName"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        {{ t('fields.companyName') }}
      </label>
      <input
        id="companyName"
        v-model="values.companyName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('companyName') }"
        @blur="touch('companyName')"
      />
      <span
        v-if="values.accountType === 'company' && hasError('companyName')"
        class="block text-sm text-red-600 mt-1"
      >
        {{ error('companyName') }}
      </span>
    </div>

    <div class="mb-4">
      <label
        for="password"
        class="block text-sm font-medium text-gray-700 mb-2"
        >{{ t('fields.password') }}</label
      >
      <input
        id="password"
        v-model="values.password"
        type="password"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('password') }"
        @blur="touch('password')"
      />
      <span
        v-if="hasError('password')"
        class="block text-sm text-red-600 mt-1"
        >{{ error('password') }}</span
      >
    </div>

    <div class="mb-6">
      <label
        for="confirm"
        class="block text-sm font-medium text-gray-700 mb-2"
        >{{ t('fields.confirmPassword') }}</label
      >
      <input
        id="confirm"
        v-model="values.confirm"
        type="password"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500 bg-red-50': hasError('confirm') }"
        @blur="touch('confirm')"
      />
      <span
        v-if="hasError('confirm')"
        class="block text-sm text-red-600 mt-1"
        >{{ error('confirm') }}</span
      >
    </div>

    {{
      {
        isDirty: isDirty,
        isValid: isValid,
        isSubmitting: isSubmitting,
      }
    }}

    <button
      type="submit"
      :disabled="!isDirty || !isValid || isSubmitting"
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {{ isSubmitting ? t('buttons.submitting') : t('buttons.submit') }}
    </button>
  </form>
</template>
