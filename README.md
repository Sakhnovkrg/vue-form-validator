# Vue Form Validator

**English** | [Русский](README_RU.md)

A modern, type-safe form validation library for Vue 3 with an intuitive API and powerful features.

⚠️ **The library is under active development**

## [Demo](https://sakhnovkrg.github.io/vue-form-validator/)

## ✨ Key Features

- 🚀 **Zero dependencies** - Lightweight and fast (~6kB gzipped)
- 🦄 **Type safety** - Full TypeScript support with autocompletion
- 📋 **Declarative** - The whole form is defined in one place: structure, validation, and handling
- 🎯 **Intuitive API** - Simple and clear methods for working with forms
- 🔄 **Reactivity** - Real-time validation powered by Vue reactivity
- 🌍 **Internationalization** - Support for reactive error messages
- 📂 **File uploads** - Built-in file validation with helpers
- 📝 **Dynamic arrays** - Validation support for arrays of objects
- ⚡ **Async validation** - Remote validation with debouncing
- 🔗 **Cross-field validation** - Field dependencies and comparisons
- 🎨 **Flexibility** - Custom rules and conditional validation

## 🧬 Smart typing

The library is designed with a strong focus on type safety. `createForm` supports both simple and nested data structures.

TypeScript enforces correct field names at every level:

**For top-level form fields (strict typing):**

```typescript
const form = createForm({
  email: '',
  password: ''
}, ...)

form.error('email')    // ✅ Correct - the field exists
form.error('invalid')  // ❌ TypeScript error - the field does not exist
form.hasError('password') // ✅ Correct with autocompletion
```

**For nested array and object fields (advanced typing):**

```typescript
const form = createForm({
  contacts: [{ name: '', email: '' }],
  address: { street: '', city: '' }
}, ...)

// ✅ TypeScript automatically infers valid paths:
form.hasError('contacts.0.name')    // contacts.${number}.name
form.hasError('contacts.0.email')   // contacts.${number}.email
form.hasError('address.street')     // address.street
form.hasError('address.city')       // address.city

// ❌ TypeScript won't allow non-existent paths:
form.hasError('contacts.0.invalid') // Compilation error!
form.hasError('address.invalid')    // Compilation error!

// ✅ Use helpers for autocompletion:
form.hasError(form.arrayPath('contacts', 0, 'name'))   // autocompletion
form.hasError(form.objectPath('address', 'street'))    // autocompletion
```

Types are automatically inferred from the initial values, providing full type safety across all API levels.

## ⚡ Supported data structures

`createForm` supports all types of data structures:

- ✅ **Simple fields** - `string`, `number`, `boolean`, `File`, `File[]`
- ✅ **Arrays of objects** - dynamic lists with per-item validation
- ✅ **Nested objects** - multi-level data structures
- ✅ **Mixed structures** - combinations of simple fields, arrays, and objects

## 📦 Installation

```bash
npm install @sakhnovkrg/vue-form-validator
```

## 🚀 Quick start

```vue
<script setup lang="ts">
import { createForm } from '@sakhnovkrg/vue-form-validator'

const {
  values,
  isDirty,
  isValid,
  isSubmitting,
  error,
  hasError,
  touch,
  submit,
} = createForm(
  {
    email: '',
    password: '',
  },
  (r, define) =>
    define({
      email: r.required().email(),
      password: r.required().minLength(8),
    }),
  {
    async onSubmit(values) {
      console.log('Form submitted:', values)
    },
  }
)
</script>

<template>
  <form @submit.prevent="submit">
    <div>
      <input
        v-model="values.email"
        @blur="touch('email')"
        placeholder="Email"
      />
      <span v-if="hasError('email')" class="error">
        {{ error('email') }}
      </span>
    </div>

    <div>
      <input
        v-model="values.password"
        @blur="touch('password')"
        type="password"
        placeholder="Password"
      />
      <span v-if="hasError('password')" class="error">
        {{ error('password') }}
      </span>
    </div>

    <button type="submit" :disabled="!isDirty || !isValid || isSubmitting">
      {{ isSubmitting ? 'Submitting...' : 'Submit' }}
    </button>
  </form>
</template>
```

## 🎯 Declarative approach

All form logic is defined in a single `createForm()` call:

```typescript
import { createForm } from '@sakhnovkrg/vue-form-validator'

const form = createForm(
  // 1. Data structure
  { email: '', password: '' },
  // 2. Validation rules
  (r, define) =>
    define({
      email: r.required().email(),
      password: r.required().minLength(8),
    }),
  // 3. Event handlers
  {
    onSubmit: values => {
      /* submit the form */
    },
  }
)
```

**Benefits:**

- ✅ No separate schemas or scattered logic
- ✅ TypeScript automatically infers types from the definition
- ✅ The whole form is visible in one place - easy to understand and maintain
- ✅ Less boilerplate code

## 🌍 Internationalization (i18n)

For internationalization you'll need a **reactive approach** with [computed()](https://vuejs.org/guide/essentials/computed.html), which automatically updates error messages when the language changes.

### Plain approach (without i18n)

```typescript
// Simple and fast - for forms with fixed messages
const form = createForm(initialValues, (r, define) =>
  define({
    email: r.required('Email is required').email('Invalid format'),
  })
)
```

### Reactive approach (with i18n)

```typescript
// Reactive messages - updated when the language changes
const form = createForm(
  initialValues,
  computed(() => {
    const r = createRules()
    return {
      email: r.required(t('validation.required')).email(t('validation.email')),
    }
  })
)
```

**Full example with vue-i18n:**

```vue
<script setup lang="ts">
import { createForm, createRules } from '@sakhnovkrg/vue-form-validator'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

const form = createForm(
  { username: '', email: '', password: '' },
  // instead of (r, define) => ...
  computed(() => {
    const r = createRules()

    return {
      username: r.required(t('validation.required')),
      email: r.required(t('validation.required')).email(t('validation.email')),
      password: r
        .required(t('validation.required'))
        .minLength(6, t('validation.minLength', { count: 6 })),
    }
  }),
  {
    onSubmit: async values => {
      console.log('Form submitted:', values)
    },
  }
)
</script>

<template>
  <form @submit.prevent="form.submit">
    <!-- .values and .val are interchangeable, .val is handier in script -->
    <input v-model="form.values.username" @blur="form.touch('username')" />
    <span v-if="form.hasError('username')">{{ form.error('username') }}</span>

    <input v-model="form.values.email" @blur="form.touch('email')" />
    <span v-if="form.hasError('email')">{{ form.error('email') }}</span>

    <!-- Other fields... -->
  </form>
</template>
```

## 📖 API Reference

### `createForm(initialValues, rulesBuilder, options?)`

Creates a reactive form with validation.

**Parameters:**

- `initialValues` - Initial form values (supports type inference)
- `rulesBuilder` - A rules builder function `(r, define) => define({...})` or a reactive computed `computed(() => { const r = createRules(); return {...} })` for i18n
- `options` - Additional settings

**Settings:**

- `onSubmit?` - Form submit handler
- `onClear?` - Form clear handler

**Returns:** A form instance with reactive properties and methods

**Supported capabilities:**

- Support for nested paths like `'contacts.0.email'`
- `arrayPath()` and `objectPath()` methods for type-safe path building
- Array management: `addArrayItem()`, `removeArrayItem()`, `toggleArrayItem()`
- Automatic optimization depending on the data structure

### Form properties and methods

#### Reactive state

| Property        | Type                            | Description                                          |
| --------------- | ------------------------------- | --------------------------------------------------- |
| `values`        | `Ref<T>`                        | Current form values (reactive ref)                  |
| `val`           | `T`                             | Getter for convenient access to values (in script)  |
| `errors`        | `Ref<Record<string, string[]>>` | Validation errors by field                          |
| `touched`       | `Ref<Record<string, boolean>>`  | "Touched" state of fields                           |
| `dirty`         | `Ref<Record<string, boolean>>`  | Changed fields                                      |
| `isValidating`  | `Ref<Record<string, boolean>>`  | Fields currently being validated                    |
| `isSubmitting`  | `Ref<boolean>`                  | Form submission status                              |
| `isValid`       | `ComputedRef<boolean>`          | Validity of the whole form                          |
| `isDirty`       | `ComputedRef<boolean>`          | Whether there are unsaved changes                   |
| `hasAnyErrors`  | `ComputedRef<boolean>`          | Whether the form has any errors                     |
| `touchedFields` | `ComputedRef<string[]>`         | List of "touched" fields                            |
| `dirtyFields`   | `ComputedRef<string[]>`         | List of changed fields                              |

#### Validation methods

| Method                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `setRules(rules)`     | Set validation rules                              |
| `validateField(name)` | Validate a field (regular or nested)              |
| `validateForm()`      | Validate the whole form                           |
| `submit()`            | Submit the form after validation                  |
| `touch(field)`        | Mark a field as "touched" (regular or nested)     |

#### State management

| Method               | Description                          |
| -------------------- | ------------------------------------ |
| `setValues(values)`  | Update field values                  |
| `getValues()`        | Get a copy of the current values     |
| `clear(useInitial?)` | Clear the form                       |
| `reset(newValues?)`  | Reset the form to its initial values |
| `resetState()`       | Reset the validation state           |
| `setErrors(errors)`  | Set errors for fields                |
| `resetErrors()`      | Clear all errors                     |

#### Checking field state

**Unified methods (work with both regular and nested fields):**

| Method                  | Returns          | Description                       |
| ----------------------- | ---------------- | --------------------------------- |
| `hasError(field)`       | `boolean`        | Whether the field has errors      |
| `error(field)`          | `string \| null` | The first error of the field      |
| `allErrors(field)`      | `string[]`       | All errors of the field           |
| `isTouched(field)`      | `boolean`        | Whether the field was "touched"   |
| `validating(field)`     | `boolean`        | Whether the field is validating   |
| `isFieldDirty(field)`   | `boolean`        | Whether the field has changed     |
| `getFieldStatus(field)` | `FieldStatus`    | Full info about the field's state |

**Usage examples:**

```typescript
// Regular fields
form.hasError('email')
form.error('name')

// Nested paths
form.hasError('contacts.0.email')
form.error('address.street')

// With autocompletion via helpers
form.hasError(form.arrayPath('contacts', 0, 'email'))
form.error(form.objectPath('address', 'street'))
```

#### Working with nested structures

| Method                                   | Description                                      |
| ---------------------------------------- | ------------------------------------------------ |
| `addArrayItem(arrayPath, item)`          | Add an item to an array                          |
| `removeArrayItem(arrayPath, index)`      | Remove an item from an array                     |
| `toggleArrayItem(arrayPath, item)`       | Toggle an item in an array (add/remove)          |
| `arrayIncludes(arrayPath, item)`         | Check whether an item is contained in an array   |
| `arrayPath(arrayField, index, property)` | Build a type-safe path to an array element       |
| `objectPath(objectField, property)`      | Build a type-safe path to an object property     |

#### File utilities

| Property                    | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `file.{fieldName}.files`    | `ComputedRef<File[]>` - List of files                |
| `file.{fieldName}.fileInfo` | `ComputedRef<FileInfo[]>` - Info about files         |
| `file.{fieldName}.handler`  | `(event: Event) => void` - File selection handler    |
| `file.{fieldName}.clear`    | `() => void` - Clear selected files and the DOM input |

**Note:** Helpers are created lazily on first access. For multiple selection, set `multiple` on the `<input type="file">` — the library detects it automatically from the input event.

**Important:** The `clear()` method fully clears file fields - both the value in the form and the visual display in the DOM input element. This prevents the situation where, after `clear()`, the file disappears from the form but remains displayed in the input.

#### Advanced methods

| Method               | Description                                                  |
| -------------------- | ----------------------------------------------------------- |
| `clearCache(field?)` | Clear the validation cache (per field or the whole cache)   |
| `dispose()`          | Stop watchers and free resources (automatic on unmount)     |

## 🛠️ Built-in validation rules

### Basic rules

```typescript
r.required('Custom message') // Required field
r.email() // Valid email
r.minLength(5) // Minimum length
r.maxLength(100) // Maximum length
r.numeric() // Digits only
r.regex(/pattern/, 'message') // Custom regex
r.oneOf(['a', 'b', 'c']) // Must be one of the values
```

### Numeric rules

```typescript
r.minValue(0) // Minimum value
r.maxValue(100) // Maximum value
r.between(0, 100) // Value range
```

### Cross-field rules

```typescript
r.sameAs('password') // Must match another field
r.dateAfter('startDate') // Date must be after another field
r.requiredIf('type', 'business') // Required under a condition
```

### File rules

```typescript
r.fileRequired() // File selection is required
r.fileSize(5 * 1024 * 1024) // Maximum file size (5MB)
r.fileType(['.jpg', '.png']) // Allowed file types
r.fileCount(1, 5) // Range for the number of files
```

The limit and the type list can be **reactive** — a `ref`, a `computed` or a getter.
The value is resolved at validation time rather than when the rule is created, so
a rule survives data that arrives later (the user's plan) as well as a dependency
on another form field:

```typescript
r.fileSize(() => limits.value.preset) // limit comes with the profile
r.fileType(allowedExtensions) // ref/computed: depends on the selected kind
r.fileType('.mp3') // a single type can be passed as a string
```

### Array rules

```typescript
r.arrayRequired() // Checks that the value is an array with at least one element
r.arrayMinLength(1) // Minimum array length
r.arrayMaxLength(10) // Maximum array length
```

**Note**: `arrayRequired()` and `arrayMinLength(1)` work the same way, but `arrayRequired()` provides a more semantic name for required arrays.

### Advanced rules

```typescript
// Remote validation with debouncing
r.remote(
  async username => {
    const response = await fetch(`/api/check-username/${username}`)
    return response.ok
  },
  'This username is already taken',
  500
)

// Custom validation
r.custom((value, allValues) => {
  return value.includes(allValues.domain)
}, 'Invalid format')
```

## 📂 File uploads

### Configuration

```typescript
import { createForm } from '@sakhnovkrg/vue-form-validator'

const form = createForm(
  {
    avatar: null as File | null,
    documents: null as File[] | null,
  },
  (r, define) =>
    define({
      avatar: r
        .fileRequired()
        .fileType(['.jpg', '.jpeg', '.png'])
        .fileSize(3 * 1024 * 1024),
      documents: r.fileRequired().fileCount(1, 5),
    })
)
```

### Usage

```vue
<template>
  <!-- Single file -->
  <input type="file" @change="form.file.avatar.handler" />
  <div v-if="form.file.avatar.files.value.length">
    Selected: {{ form.file.avatar.fileInfo.value[0]?.name }}
    <button @click="form.file.avatar.clear()">Remove</button>
  </div>

  <!-- Multiple files -->
  <input type="file" multiple @change="form.file.documents.handler" />
  <div v-if="form.file.documents.files.value.length">
    <p>Files: {{ form.file.documents.files.value.length }}</p>
    <ul>
      <li v-for="file in form.file.documents.fileInfo.value" :key="file.name">
        {{ file.name }} ({{ file.formattedSize }})
      </li>
    </ul>
    <button @click="form.file.documents.clear()">Clear all</button>
  </div>
</template>
```

## 📝 Nested data structures

The library supports validation of dynamic arrays and nested objects with a type-safe API.

### Dynamic arrays

```typescript
interface Contact {
  name: string
  email: string
  role: string
}

const form = createForm(
  {
    teamName: '',
    contacts: [] as Contact[],
  },
  r => ({
    teamName: r.required(),
    contacts: r.arrayMinLength(1),
    'contacts.*.name': r.required(),
    'contacts.*.email': r.required().email(),
    'contacts.*.role': r.required(),
  })
)

// Array management
form.addArrayItem('contacts', { name: '', email: '', role: '' })
form.removeArrayItem('contacts', index)
```

**Component example:**

```vue
<template>
  <div v-for="(contact, index) in form.values.contacts" :key="index">
    <input
      v-model="contact.name"
      @blur="form.touch(form.arrayPath('contacts', index, 'name'))"
    />
    <span v-if="form.hasError(form.arrayPath('contacts', index, 'name'))">
      {{ form.error(form.arrayPath('contacts', index, 'name')) }}
    </span>

    <button @click="form.removeArrayItem('contacts', index)">Remove</button>
  </div>

  <button
    @click="form.addArrayItem('contacts', { name: '', email: '', role: '' })"
  >
    Add contact
  </button>
</template>
```

### Nested objects

```typescript
const form = createForm(
  {
    name: '',
    address: { street: '', city: '', zipCode: '' },
    profile: { bio: '', website: '' },
  },
  r => ({
    name: r.required(),
    'address.street': r.required(),
    'address.city': r.required(),
    'address.zipCode': r.required().regex(/^\d{5}$/, 'ZIP: 5 digits'),
    'profile.bio': r.maxLength(200),
    'profile.website': r.regex(/^https?:\/\/.+/, 'Start with http://'),
  })
)
```

**Component example:**

```vue
<template>
  <fieldset>
    <legend>Address</legend>

    <!-- String paths — simple and clear -->
    <input
      v-model="form.values.address.street"
      @blur="form.touch('address.street')"
    />
    <span v-if="form.hasError('address.street')">{{
      form.error('address.street')
    }}</span>

    <!-- objectPath() — with TypeScript autocompletion -->
    <input
      v-model="form.values.address.city"
      @blur="form.touch(form.objectPath('address', 'city'))"
    />
    <span v-if="form.hasError(form.objectPath('address', 'city'))">
      {{ form.error(form.objectPath('address', 'city')) }}
    </span>
  </fieldset>
</template>
```

## 🎯 Advanced examples

### Conditional validation

```typescript
createForm({ type: '', companyName: '' }, (r, define) =>
  define({
    type: r.required().oneOf(['personal', 'business']),
    companyName: r.requiredIf('type', 'business'),
  })
)
```

### Async username check

```typescript
createForm({ username: '' }, (r, define) =>
  define({
    username: r
      .required()
      .minLength(3)
      .remote(
        async name => !(await fetch(`/api/users/${name}`)).ok,
        'This username is already taken'
      ),
  })
)
```

### Date range validation

```typescript
createForm({ startDate: '', endDate: '' }, (r, define) =>
  define({
    startDate: r.required(),
    endDate: r.required().dateAfter('startDate'),
  })
)
```

### Universal form for create and edit

The same form for creating and editing. The key point — when loading data, use `reset()`, not `setValues()`, to update the baseline so `isDirty` stays `false`.

```vue
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { createForm } from '@sakhnovkrg/vue-form-validator'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const userId = computed(() =>
  route.params.id ? Number(route.params.id) : null
)
const isEditMode = computed(() => !!userId.value)

const form = createForm(
  {
    name: '',
    email: '',
    avatar: null as File | null,
  },
  (r, define) =>
    define({
      name: r.required().minLength(2),
      email: r.required().email(),
      avatar: [
        r.fileType(['.jpg', '.jpeg', '.png']),
        r.fileSize(3 * 1024 * 1024),
      ],
    }),
  {
    async onSubmit(values) {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('email', values.email)
      if (values.avatar) formData.append('avatar', values.avatar)

      const url = isEditMode.value ? `/api/users/${userId.value}` : '/api/users'
      const method = isEditMode.value ? 'PUT' : 'POST'

      const response = await fetch(url, { method, body: formData })

      if (!response.ok) {
        const data = await response.json()
        form.setErrors(data.fieldErrors)
        return
      }

      const userData = await response.json()
      if (!isEditMode.value) {
        await router.push(`/users/${userData.id}/edit`)
      }
    },
  }
)

// Loading data: reset() updates the baseline, the form stays clean
onMounted(async () => {
  if (userId.value) {
    const { name, email } = await fetch(`/api/users/${userId.value}`).then(r =>
      r.json()
    )
    form.reset({ name, email })
  }
})
</script>

<template>
  <form @submit.prevent="form.submit">
    <input
      v-model="form.values.name"
      @blur="form.touch('name')"
      placeholder="Name"
    />
    <span v-if="form.hasError('name')">{{ form.error('name') }}</span>

    <input
      v-model="form.values.email"
      @blur="form.touch('email')"
      placeholder="Email"
    />
    <span v-if="form.hasError('email')">{{ form.error('email') }}</span>

    <input type="file" @change="form.file.avatar.handler" />

    <button
      type="submit"
      :disabled="!form.isDirty || !form.isValid || form.isSubmitting"
    >
      {{
        form.isSubmitting
          ? 'Saving...'
          : isEditMode
            ? 'Save'
            : 'Create'
      }}
    </button>
  </form>
</template>
```

### Setting errors on fields

```typescript
const form = createForm({ username: '', email: '' }, (r, define) =>
  define({
    username: r.required().minLength(3),
    email: r.required().email(),
  })
)

// Set an error for a single field
form.setErrors({ username: ['This username is already taken'] })

// Set errors for multiple fields
form.setErrors({
  username: ['Invalid characters in the name'],
  email: ['Email is already registered', 'Invalid email format'],
})

// Clear all errors
form.resetErrors()

// Check whether an error exists
if (form.hasError('username')) {
  console.log(form.error('username')) // The first error
  console.log(form.allErrors('username')) // All errors of the field
}
```

A typical pattern for handling server-side errors — inside `onSubmit`:

```typescript
const form = createForm(
  { email: '', username: '' },
  (r, define) =>
    define({ email: r.required().email(), username: r.required() }),
  {
    async onSubmit(values) {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        // The server returns: { fieldErrors: { email: ['Already exists'] } }
        const { fieldErrors } = await res.json()
        if (fieldErrors) form.setErrors(fieldErrors)
        return
      }

      console.log('Created:', await res.json())
    },
  }
)
```

## ⚡ Validation caching

The library automatically caches validation results to improve performance. The cache is cleared automatically when:

- A field value changes
- A field is marked as touched (`touch`)
- `clearCache(fieldName)` is called

### Automatic cache clearing

The cache is cleared automatically in these methods:

- `setValues()` - for all changed fields
- `toggleArrayItem()`, `addArrayItem()`, `removeArrayItem()` - for arrays
- When values change via `v-model`

### When to clear the cache manually

In most cases the cache is cleared automatically. Manual clearing is only needed when:

```typescript
// Direct manipulation of reactive data (not recommended)
form.val.tags.push('newItem') // use addArrayItem instead
form.clearCache('tags') // manual clearing is needed in such cases

// Extremely rare debugging cases
form.clearCache() // clear the entire cache
```

**Recommendation**: Use the built-in methods (`setValues`, `addArrayItem`, etc.) - they manage the cache automatically.

**Real-world problem example**: When removing all elements from an array via `splice()` directly, the cache may contain a stale validation result. The solution is to use `removeArrayItem()` or clear the cache manually.

## 🧪 Development

### Running the playground

```bash
npm run dev
```

Opens the development playground with live examples at `http://localhost:3000`

### Tests

```bash
npm test                  # Run tests
npm run test -- --coverage # Run tests with coverage
```

### Build

```bash
npm run build             # Build the library and types
npm run build:playground  # Build the playground for deployment
npm run preview           # Preview the built playground
```
