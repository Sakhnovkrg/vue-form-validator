<script setup lang="ts">
import { createForm, createRules, custom } from '@'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const { t } = useI18n()

// Fake async checks
async function checkEmailUnique(email: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 200))
  return email !== 'taken@example.com'
}
async function checkUsernameUnique(username: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 200))
  return username.toLowerCase() !== 'admin'
}
async function checkDomainExists(website: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 250))
  return !website.includes('deadlink')
}

const {
  values,
  isValid,
  isDirty,
  isSubmitting,
  error,
  hasError,
  hasAnyErrors,
  validating,
  touch,
  submit,
  clear,
  reset,
  addArrayItem,
  removeArrayItem,
  toggleArrayItem,
  arrayIncludes,
  arrayPath,
  file,
} = createForm(
  {
    // -- Section 1: Personal info --
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',

    // -- Section 2: Account --
    accountType: '' as '' | 'personal' | 'business' | 'enterprise',
    companyName: '',
    companySize: '' as '' | 'small' | 'medium' | 'large',
    bin: '',

    // -- Section 3: Event config --
    eventType: '' as '' | 'conference' | 'workshop' | 'webinar',
    eventDate: '',
    budget: '',
    dietaryTags: [] as string[],
    specialNeeds: '',

    // -- Section 4: Participants (dynamic array) --
    participants: [] as Array<{
      name: string
      email: string
      role: string
      phone: string
    }>,

    // -- Section 5: Addresses (nested objects via array) --
    addresses: [
      { label: 'primary', street: '', city: '', zip: '', country: '' },
    ] as Array<{
      label: string
      street: string
      city: string
      zip: string
      country: string
    }>,

    // -- Section 6: Files --
    avatar: null as File | null,
    documents: [] as File[],

    // -- Section 7: Profile --
    bio: '',
    website: '',
    socialLinks: [] as string[],

    // -- Section 8: Settings --
    notifications: [] as string[],
    theme: 'light' as 'light' | 'dark',
    agree: false,
  },
  computed(() => {
    const r = createRules()

    return {
      // Personal
      firstName: r
        .required(t('stress.v.required'))
        .minLength(2, t('stress.v.min2')),
      lastName: r
        .required(t('stress.v.required'))
        .minLength(2, t('stress.v.min2')),
      username: r
        .required(t('stress.v.required'))
        .minLength(3, t('stress.v.min3'))
        .regex(/^[a-zA-Z0-9_]+$/, t('stress.v.usernameFormat'))
        .remote(checkUsernameUnique, t('stress.v.usernameTaken')),
      email: r
        .required(t('stress.v.required'))
        .email(t('stress.v.email'))
        .remote(checkEmailUnique, t('stress.v.emailTaken')),
      phone: r
        .required(t('stress.v.required'))
        .regex(/^\+7\d{10}$/, t('stress.v.phone')),
      password: r
        .required(t('stress.v.required'))
        .minLength(8, t('stress.v.min8'))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t('stress.v.passwordStrength')
        ),
      confirmPassword: r
        .required(t('stress.v.required'))
        .sameAs('password', t('stress.v.sameAs')),
      birthDate: r.required(t('stress.v.required')).custom((v: string) => {
        if (!v) return true
        const birth = new Date(v)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        return age >= 18 || t('stress.v.minAge')
      }),

      // Account
      accountType: r.required(t('stress.v.required')),
      companyName: r
        .requiredIf('accountType', 'business', t('stress.v.companyRequired'))
        .requiredIf('accountType', 'enterprise', t('stress.v.companyRequired'))
        .maxLength(100, t('stress.v.max100')),
      companySize: r
        .requiredIf('accountType', 'business', t('stress.v.required'))
        .requiredIf('accountType', 'enterprise', t('stress.v.required')),
      bin: [
        custom((val: string, allValues: any) => {
          if (allValues.accountType === 'enterprise' && !val)
            return t('stress.v.binRequired')
          return true
        }),
      ],

      // Event
      eventType: r.required(t('stress.v.required')),
      eventDate: r.required(t('stress.v.required')).custom((val: string) => {
        if (!val) return true
        const minDate = new Date()
        minDate.setDate(minDate.getDate() + 7)
        minDate.setHours(0, 0, 0, 0)
        return new Date(val) >= minDate ? true : t('stress.v.minWeekAhead')
      }),
      budget: r
        .required(t('stress.v.required'))
        .numeric(t('stress.v.numeric'))
        .between(100, 100000, t('stress.v.budgetRange')),
      dietaryTags: r.arrayRequired(t('stress.v.pickOne')),
      specialNeeds: r.maxLength(500, t('stress.v.max500')),

      // Participants wildcard
      participants: r.arrayMinLength(1, t('stress.v.addParticipant')),
      'participants.*.name': r
        .required(t('stress.v.required'))
        .minLength(2, t('stress.v.min2')),
      'participants.*.email': r
        .required(t('stress.v.required'))
        .email(t('stress.v.email')),
      'participants.*.role': r.required(t('stress.v.required')),
      'participants.*.phone': r.regex(/^\+7\d{10}$/, t('stress.v.phone')),

      // Addresses wildcard
      'addresses.*.street': r
        .required(t('stress.v.required'))
        .minLength(3, t('stress.v.min3')),
      'addresses.*.city': r.required(t('stress.v.required')),
      'addresses.*.zip': r
        .required(t('stress.v.required'))
        .regex(/^\d{5,6}$/, t('stress.v.zipFormat')),
      'addresses.*.country': r.required(t('stress.v.required')),

      // Files
      avatar: r
        .fileSize(2 * 1024 * 1024, t('stress.v.fileSize2'))
        .fileType(
          ['image/jpeg', 'image/png', 'image/webp'],
          t('stress.v.imageOnly')
        ),
      documents: r
        .fileCount(1, 5, t('stress.v.fileCount'))
        .fileSize(10 * 1024 * 1024, t('stress.v.fileSize10')),

      // Profile
      bio: r.maxLength(1000, t('stress.v.max1000')),
      website: [
        custom(async (val: string) => {
          if (!val) return true
          if (!/^https?:\/\//.test(val)) return t('stress.v.urlFormat')
          const ok = await checkDomainExists(val)
          return ok ? true : t('stress.v.deadLink')
        }),
      ],

      'socialLinks.*': [
        custom((val: string) => {
          if (!val) return true
          return /^https?:\/\//.test(val) ? true : t('stress.v.urlFormat')
        }),
      ],

      // Settings
      notifications: r.arrayRequired(t('stress.v.pickNotification')),
      agree: [custom((val: boolean) => (val ? true : t('stress.v.mustAgree')))],
    }
  }),
  {
    async onSubmit(formValues) {
      await new Promise(r => setTimeout(r, 1000))
      // eslint-disable-next-line no-console
      console.log('Form submitted:', formValues)
      alert('OK! (full data in console)')
    },
  }
)

// Performance counter — НЕ reactive, чтобы не вызывать рекурсивные рендеры
let _renderCount = 0
const getRenderCount = () => ++_renderCount

// Sections collapse state
const sections = ref({
  personal: true,
  account: true,
  event: true,
  participants: true,
  addresses: true,
  files: true,
  profile: true,
  settings: true,
})

function toggleSection(key: keyof typeof sections.value) {
  sections.value[key] = !sections.value[key]
}

// Helpers
const dietaryOptions = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'halal',
  'kosher',
  'none',
]
const notificationOptions = ['email', 'sms', 'push', 'slack']
const roles = ['speaker', 'attendee', 'organizer', 'volunteer']
const countries = [
  'KZ',
  'US',
  'UK',
  'DE',
  'FR',
  'JP',
  'AU',
  'CA',
  'BR',
  'IN',
  'RU',
]

function addParticipant() {
  addArrayItem('participants', { name: '', email: '', role: '', phone: '' })
}

function addAddress() {
  addArrayItem('addresses', {
    label: '',
    street: '',
    city: '',
    zip: '',
    country: '',
  })
}
</script>

<template>
  <form class="mx-auto p-6 space-y-4" @submit.prevent="submit">
    <h2 class="text-2xl font-bold text-gray-900">{{ t('stress.title') }}</h2>
    <p class="text-sm text-gray-500">{{ t('stress.subtitle') }}</p>

    <!-- Stats bar (affix) -->
    <Teleport to="body">
      <div
        class="fixed bottom-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-xs font-mono shadow-lg backdrop-blur-sm"
        :class="
          hasAnyErrors
            ? 'bg-red-50/90 border-t border-red-200'
            : 'bg-green-50/90 border-t border-green-200'
        "
      >
        <span :class="isDirty ? 'text-amber-600' : 'text-gray-400'"
          >dirty: {{ isDirty }}</span
        >
        <span :class="isValid ? 'text-green-600' : 'text-red-600'"
          >valid: {{ isValid }}</span
        >
        <span class="text-blue-600">renders: {{ getRenderCount() }}</span>
        <span v-if="isSubmitting" class="text-purple-600 animate-pulse"
          >submitting...</span
        >
        <button
          type="button"
          class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          @click="clear()"
        >
          clear
        </button>
        <button
          type="button"
          class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          @click="reset()"
        >
          reset
        </button>
      </div>
    </Teleport>

    <!-- ============ SECTION 1: Personal ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('personal')"
      >
        {{ sections.personal ? '▾' : '▸' }} {{ t('stress.sections.personal') }}
      </legend>

      <div
        v-show="sections.personal"
        class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <!-- First name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.firstName') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.firstName"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('firstName') }"
            @blur="touch('firstName')"
          />
          <span v-if="hasError('firstName')" class="text-xs text-red-600">{{
            error('firstName')
          }}</span>
        </div>

        <!-- Last name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.lastName') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.lastName"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('lastName') }"
            @blur="touch('lastName')"
          />
          <span v-if="hasError('lastName')" class="text-xs text-red-600">{{
            error('lastName')
          }}</span>
        </div>

        <!-- Username -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.username') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.username"
            placeholder="admin"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('username') }"
            @blur="touch('username')"
          />
          <span
            v-if="validating('username')"
            class="text-xs text-blue-600 animate-pulse"
            >{{ t('stress.checking') }}...</span
          >
          <span v-else-if="hasError('username')" class="text-xs text-red-600">{{
            error('username')
          }}</span>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.email') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.email"
            type="email"
            placeholder="taken@example.com"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('email') }"
            @blur="touch('email')"
          />
          <span
            v-if="validating('email')"
            class="text-xs text-blue-600 animate-pulse"
            >{{ t('stress.checking') }}...</span
          >
          <span v-else-if="hasError('email')" class="text-xs text-red-600">{{
            error('email')
          }}</span>
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.phone') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.phone"
            placeholder="+7XXXXXXXXX"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('phone') }"
            @blur="touch('phone')"
          />
          <span v-if="hasError('phone')" class="text-xs text-red-600">{{
            error('phone')
          }}</span>
        </div>

        <!-- Birth date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.birthDate') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.birthDate"
            type="date"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('birthDate') }"
            @blur="touch('birthDate')"
          />
          <span v-if="hasError('birthDate')" class="text-xs text-red-600">{{
            error('birthDate')
          }}</span>
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.password') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.password"
            type="password"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('password') }"
            @blur="touch('password')"
          />
          <span v-if="hasError('password')" class="text-xs text-red-600">{{
            error('password')
          }}</span>
        </div>

        <!-- Confirm password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.confirmPassword') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.confirmPassword"
            type="password"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('confirmPassword') }"
            @blur="touch('confirmPassword')"
          />
          <span
            v-if="hasError('confirmPassword')"
            class="text-xs text-red-600"
            >{{ error('confirmPassword') }}</span
          >
        </div>
      </div>
    </fieldset>

    <!-- ============ SECTION 2: Account ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('account')"
      >
        {{ sections.account ? '▾' : '▸' }} {{ t('stress.sections.account') }}
      </legend>

      <div v-show="sections.account" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.accountType') }}
            <span class="text-red-500">*</span></label
          >
          <select
            v-model="values.accountType"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('accountType') }"
            @blur="touch('accountType')"
          >
            <option value="">--</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <span v-if="hasError('accountType')" class="text-xs text-red-600">{{
            error('accountType')
          }}</span>
        </div>

        <div
          v-if="
            values.accountType === 'business' ||
            values.accountType === 'enterprise'
          "
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >{{ t('stress.f.companyName') }}
              <span class="text-red-500">*</span></label
            >
            <input
              v-model="values.companyName"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 bg-red-50': hasError('companyName') }"
              @blur="touch('companyName')"
            />
            <span v-if="hasError('companyName')" class="text-xs text-red-600">{{
              error('companyName')
            }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >{{ t('stress.f.companySize') }}
              <span class="text-red-500">*</span></label
            >
            <select
              v-model="values.companySize"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 bg-red-50': hasError('companySize') }"
              @blur="touch('companySize')"
            >
              <option value="">--</option>
              <option value="small">1-50</option>
              <option value="medium">51-500</option>
              <option value="large">500+</option>
            </select>
            <span v-if="hasError('companySize')" class="text-xs text-red-600">{{
              error('companySize')
            }}</span>
          </div>
        </div>

        <div v-if="values.accountType === 'enterprise'">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >{{ t('stress.f.bin') }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="values.bin"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('bin') }"
            @blur="touch('bin')"
          />
          <span v-if="hasError('bin')" class="text-xs text-red-600">{{
            error('bin')
          }}</span>
        </div>
      </div>
    </fieldset>

    <!-- ============ SECTION 3: Event ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('event')"
      >
        {{ sections.event ? '▾' : '▸' }} {{ t('stress.sections.event') }}
      </legend>

      <div v-show="sections.event" class="p-4 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >{{ t('stress.f.eventType') }}
              <span class="text-red-500">*</span></label
            >
            <select
              v-model="values.eventType"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 bg-red-50': hasError('eventType') }"
              @blur="touch('eventType')"
            >
              <option value="">--</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
            </select>
            <span v-if="hasError('eventType')" class="text-xs text-red-600">{{
              error('eventType')
            }}</span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >{{ t('stress.f.eventDate') }}
              <span class="text-red-500">*</span></label
            >
            <input
              v-model="values.eventDate"
              type="date"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 bg-red-50': hasError('eventDate') }"
              @blur="touch('eventDate')"
            />
            <span v-if="hasError('eventDate')" class="text-xs text-red-600">{{
              error('eventDate')
            }}</span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >{{ t('stress.f.budget') }}
              <span class="text-red-500">*</span></label
            >
            <input
              v-model="values.budget"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 bg-red-50': hasError('budget') }"
              @blur="touch('budget')"
            />
            <span v-if="hasError('budget')" class="text-xs text-red-600">{{
              error('budget')
            }}</span>
          </div>
        </div>

        <!-- Dietary tags (toggle array) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >{{ t('stress.f.dietaryTags') }}
            <span class="text-red-500">*</span></label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in dietaryOptions"
              :key="tag"
              type="button"
              class="px-3 py-1 rounded-full text-sm border transition-colors"
              :class="
                arrayIncludes('dietaryTags', tag)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              "
              @click="toggleArrayItem('dietaryTags', tag)"
            >
              {{ tag }}
            </button>
          </div>
          <span v-if="hasError('dietaryTags')" class="text-xs text-red-600">{{
            error('dietaryTags')
          }}</span>
        </div>

        <!-- Special needs -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.specialNeeds')
          }}</label>
          <textarea
            v-model="values.specialNeeds"
            rows="2"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('specialNeeds') }"
            @blur="touch('specialNeeds')"
          />
          <span v-if="hasError('specialNeeds')" class="text-xs text-red-600">{{
            error('specialNeeds')
          }}</span>
        </div>
      </div>
    </fieldset>

    <!-- ============ SECTION 4: Participants (dynamic array) ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('participants')"
      >
        {{ sections.participants ? '▾' : '▸' }}
        {{ t('stress.sections.participants') }} ({{
          values.participants.length
        }})
      </legend>

      <div v-show="sections.participants" class="p-4 space-y-3">
        <span
          v-if="hasError('participants')"
          class="block text-xs text-red-600"
          >{{ error('participants') }}</span
        >

        <div
          v-for="(p, i) in values.participants"
          :key="i"
          class="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2"
        >
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold text-gray-700"
              >#{{ i + 1 }}</span
            >
            <button
              type="button"
              class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              @click="removeArrayItem('participants', i)"
            >
              {{ t('buttons.remove') }}
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.name') }}
                <span class="text-red-500">*</span></label
              >
              <input
                v-model="p.name"
                :placeholder="t('stress.f.name')"
                class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                :class="{
                  'border-red-400 bg-red-50': hasError(
                    arrayPath('participants', i, 'name')
                  ),
                }"
                @blur="touch(arrayPath('participants', i, 'name'))"
              />
              <span
                v-if="hasError(arrayPath('participants', i, 'name'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('participants', i, 'name')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.email') }}
                <span class="text-red-500">*</span></label
              >
              <input
                v-model="p.email"
                :placeholder="t('stress.f.email')"
                class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                :class="{
                  'border-red-400 bg-red-50': hasError(
                    arrayPath('participants', i, 'email')
                  ),
                }"
                @blur="touch(arrayPath('participants', i, 'email'))"
              />
              <span
                v-if="hasError(arrayPath('participants', i, 'email'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('participants', i, 'email')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('contact.role') }}
                <span class="text-red-500">*</span></label
              >
              <select
                v-model="p.role"
                class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                :class="{
                  'border-red-400 bg-red-50': hasError(
                    arrayPath('participants', i, 'role')
                  ),
                }"
                @blur="touch(arrayPath('participants', i, 'role'))"
              >
                <option value="">-- role --</option>
                <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
              </select>
              <span
                v-if="hasError(arrayPath('participants', i, 'role'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('participants', i, 'role')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5">{{
                t('stress.f.phone')
              }}</label>
              <input
                v-model="p.phone"
                placeholder="+7XXXXXXXXX"
                class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                :class="{
                  'border-red-400 bg-red-50': hasError(
                    arrayPath('participants', i, 'phone')
                  ),
                }"
                @blur="touch(arrayPath('participants', i, 'phone'))"
              />
              <span
                v-if="hasError(arrayPath('participants', i, 'phone'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('participants', i, 'phone')) }}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
          @click="addParticipant"
        >
          + {{ t('stress.f.addParticipant') }}
        </button>
      </div>
    </fieldset>

    <!-- ============ SECTION 5: Addresses (dynamic array) ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('addresses')"
      >
        {{ sections.addresses ? '▾' : '▸' }}
        {{ t('stress.sections.addresses') }} ({{ values.addresses.length }})
      </legend>

      <div v-show="sections.addresses" class="p-4 space-y-3">
        <div
          v-for="(addr, i) in values.addresses"
          :key="i"
          class="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2"
        >
          <div class="flex justify-between items-center">
            <input
              v-model="addr.label"
              :placeholder="t('stress.f.addressLabel')"
              class="px-2 py-1 border rounded text-sm w-40 focus:ring-2 focus:ring-blue-500"
            />
            <button
              v-if="values.addresses.length > 1"
              type="button"
              class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              @click="removeArrayItem('addresses', i)"
            >
              {{ t('buttons.remove') }}
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.street') }}
                <span class="text-red-500">*</span></label
              >
              <input
                v-model="addr.street"
                :placeholder="t('stress.f.street')"
                class="w-full px-2 py-1.5 border rounded text-sm"
                :class="{
                  'border-red-400': hasError(
                    arrayPath('addresses', i, 'street')
                  ),
                }"
                @blur="touch(arrayPath('addresses', i, 'street'))"
              />
              <span
                v-if="hasError(arrayPath('addresses', i, 'street'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('addresses', i, 'street')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.city') }}
                <span class="text-red-500">*</span></label
              >
              <input
                v-model="addr.city"
                :placeholder="t('stress.f.city')"
                class="w-full px-2 py-1.5 border rounded text-sm"
                :class="{
                  'border-red-400': hasError(arrayPath('addresses', i, 'city')),
                }"
                @blur="touch(arrayPath('addresses', i, 'city'))"
              />
              <span
                v-if="hasError(arrayPath('addresses', i, 'city'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('addresses', i, 'city')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.zip') }}
                <span class="text-red-500">*</span></label
              >
              <input
                v-model="addr.zip"
                :placeholder="t('stress.f.zip')"
                class="w-full px-2 py-1.5 border rounded text-sm"
                :class="{
                  'border-red-400': hasError(arrayPath('addresses', i, 'zip')),
                }"
                @blur="touch(arrayPath('addresses', i, 'zip'))"
              />
              <span
                v-if="hasError(arrayPath('addresses', i, 'zip'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('addresses', i, 'zip')) }}
              </span>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5"
                >{{ t('stress.f.country') }}
                <span class="text-red-500">*</span></label
              >
              <select
                v-model="addr.country"
                class="w-full px-2 py-1.5 border rounded text-sm"
                :class="{
                  'border-red-400': hasError(
                    arrayPath('addresses', i, 'country')
                  ),
                }"
                @blur="touch(arrayPath('addresses', i, 'country'))"
              >
                <option value="">--</option>
                <option v-for="c in countries" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
              <span
                v-if="hasError(arrayPath('addresses', i, 'country'))"
                class="text-xs text-red-600"
              >
                {{ error(arrayPath('addresses', i, 'country')) }}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
          @click="addAddress"
        >
          + {{ t('stress.f.addAddress') }}
        </button>
      </div>
    </fieldset>

    <!-- ============ SECTION 6: Files ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('files')"
      >
        {{ sections.files ? '▾' : '▸' }} {{ t('stress.sections.files') }}
      </legend>

      <div v-show="sections.files" class="p-4 space-y-4">
        <!-- Avatar -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.avatar')
          }}</label>
          <input
            type="file"
            accept="image/*"
            @change="file.avatar.handler($event)"
          />
          <div
            v-if="file.avatar.fileInfo.value.length"
            class="text-xs text-gray-500 mt-1"
          >
            {{ file.avatar.fileInfo.value[0]?.name }} ({{
              file.avatar.fileInfo.value[0]?.formattedSize
            }})
            <button
              type="button"
              class="ml-2 text-red-600 underline"
              @click="file.avatar.clear()"
            >
              x
            </button>
          </div>
          <span v-if="hasError('avatar')" class="text-xs text-red-600">{{
            error('avatar')
          }}</span>
        </div>

        <!-- Documents -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.documents')
          }}</label>
          <input
            type="file"
            multiple
            @change="file.documents.handler($event)"
          />
          <div
            v-if="file.documents.fileInfo.value.length"
            class="text-xs text-gray-500 mt-1"
          >
            {{ file.documents.fileInfo.value.length }} file(s)
            <button
              type="button"
              class="ml-2 text-red-600 underline"
              @click="file.documents.clear()"
            >
              x
            </button>
          </div>
          <span v-if="hasError('documents')" class="text-xs text-red-600">{{
            error('documents')
          }}</span>
        </div>
      </div>
    </fieldset>

    <!-- ============ SECTION 7: Profile ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('profile')"
      >
        {{ sections.profile ? '▾' : '▸' }} {{ t('stress.sections.profile') }}
      </legend>

      <div v-show="sections.profile" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.bio')
          }}</label>
          <textarea
            v-model="values.bio"
            rows="3"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('bio') }"
            @blur="touch('bio')"
          />
          <div class="flex justify-between">
            <span v-if="hasError('bio')" class="text-xs text-red-600">{{
              error('bio')
            }}</span>
            <span class="text-xs text-gray-400 ml-auto"
              >{{ values.bio.length }}/1000</span
            >
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.website')
          }}</label>
          <input
            v-model="values.website"
            placeholder="https://..."
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500 bg-red-50': hasError('website') }"
            @blur="touch('website')"
          />
          <span
            v-if="validating('website')"
            class="text-xs text-blue-600 animate-pulse"
            >{{ t('stress.checking') }}...</span
          >
          <span v-else-if="hasError('website')" class="text-xs text-red-600">{{
            error('website')
          }}</span>
        </div>

        <!-- Social links (simple add/remove) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            t('stress.f.socialLinks')
          }}</label>
          <div v-for="(_, i) in values.socialLinks" :key="i" class="mb-2">
            <div class="flex gap-2">
              <input
                v-model="values.socialLinks[i]"
                placeholder="https://..."
                class="flex-1 px-2 py-1.5 border rounded text-sm"
                :class="{ 'border-red-400': hasError(`socialLinks.${i}`) }"
                @blur="touch(`socialLinks.${i}` as any)"
              />
              <button
                type="button"
                class="text-xs px-2 bg-red-100 text-red-700 rounded"
                @click="removeArrayItem('socialLinks', i)"
              >
                x
              </button>
            </div>
            <span
              v-if="hasError(`socialLinks.${i}`)"
              class="text-xs text-red-600"
            >
              {{ error(`socialLinks.${i}`) }}
            </span>
          </div>
          <button
            type="button"
            class="text-sm text-blue-600 hover:underline"
            @click="addArrayItem('socialLinks', '')"
          >
            + {{ t('stress.f.addLink') }}
          </button>
        </div>
      </div>
    </fieldset>

    <!-- ============ SECTION 8: Settings ============ -->
    <fieldset class="border border-gray-200 rounded-lg overflow-hidden">
      <legend
        class="ml-4 px-2 text-sm font-semibold text-gray-700 cursor-pointer select-none"
        @click="toggleSection('settings')"
      >
        {{ sections.settings ? '▾' : '▸' }} {{ t('stress.sections.settings') }}
      </legend>

      <div v-show="sections.settings" class="p-4 space-y-4">
        <!-- Notifications (toggle array) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >{{ t('stress.f.notifications') }}
            <span class="text-red-500">*</span></label
          >
          <div class="flex flex-wrap gap-2">
            <label
              v-for="opt in notificationOptions"
              :key="opt"
              class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer text-sm transition-colors"
              :class="
                arrayIncludes('notifications', opt)
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600'
              "
            >
              <input
                type="checkbox"
                :checked="arrayIncludes('notifications', opt)"
                class="sr-only"
                @change="toggleArrayItem('notifications', opt)"
              />
              {{ opt }}
            </label>
          </div>
          <span v-if="hasError('notifications')" class="text-xs text-red-600">{{
            error('notifications')
          }}</span>
        </div>

        <!-- Theme -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{
            t('stress.f.theme')
          }}</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input v-model="values.theme" type="radio" value="light" /> Light
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input v-model="values.theme" type="radio" value="dark" /> Dark
            </label>
          </div>
        </div>

        <!-- Agree -->
        <div>
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input
              v-model="values.agree"
              type="checkbox"
              @change="touch('agree')"
            />
            <span
              >{{ t('stress.f.agree') }}
              <span class="text-red-500">*</span></span
            >
          </label>
          <span v-if="hasError('agree')" class="text-xs text-red-600">{{
            error('agree')
          }}</span>
        </div>
      </div>
    </fieldset>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="!isDirty || isSubmitting"
      class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {{ isSubmitting ? t('stress.submitting') : t('stress.submit') }}
    </button>
  </form>
</template>
