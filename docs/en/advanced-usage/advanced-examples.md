# 🎯 Advanced Examples

## Conditional Validation

```typescript
createForm({ type: '', companyName: '' }, (r, define) =>
  define({
    type: r.required().oneOf(['personal', 'business']),
    companyName: r.requiredIf('type', 'business'),
  })
)
```

## Async Username Availability Check

```typescript
createForm({ username: '' }, (r, define) =>
  define({
    username: r
      .required()
      .minLength(3)
      .remote(
        async name => !(await fetch(`/api/users/${name}`)).ok,
        'Username is already taken'
      ),
  })
)
```

## Date Range Validation

```typescript
createForm({ startDate: '', endDate: '' }, (r, define) =>
  define({
    startDate: r.required(),
    endDate: r.required().dateAfter('startDate'),
  })
)
```

## Universal Create & Edit Form

A single form can handle both creation and updates. The key point: when loading data, use `reset()` instead of `setValues()`. This updates the baseline, ensuring `isDirty` remains `false` until the user makes new changes.

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

// Data Loading: reset() updates the baseline so the form remains "clean" (not dirty)
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
            ? 'Save Changes'
            : 'Create'
      }}
    </button>
  </form>
</template>
```

## Setting Field Errors Manually

```typescript
const form = createForm({ username: '', email: '' }, (r, define) =>
  define({
    username: r.required().minLength(3),
    email: r.required().email(),
  })
)

// Set error for a single field
form.setErrors({ username: ['This username is already taken'] })

// Set errors for multiple fields
form.setErrors({
  username: ['Invalid characters in name'],
  email: ['Email already registered', 'Invalid format'],
})

// Clear all errors
form.resetErrors()

// Check error status
if (form.hasError('username')) {
  console.log(form.error('username'))     // Get the first error
  console.log(form.allErrors('username')) // Get all errors for this field
}
```

A typical pattern for handling server-side errors within `onSubmit`:

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
        // Expected server response: { fieldErrors: { email: ['Already exists'] } }
        const { fieldErrors } = await res.json()
        if (fieldErrors) form.setErrors(fieldErrors)
        return
      }

      console.log('User created:', await res.json())
    },
  }
)
```
