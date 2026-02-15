# 🎯 Продвинутые примеры

## Условная валидация

```typescript
createForm({ type: '', companyName: '' }, (r, define) =>
  define({
    type: r.required().oneOf(['personal', 'business']),
    companyName: r.requiredIf('type', 'business'),
  })
)
```

## Асинхронная проверка имени пользователя

```typescript
createForm({ username: '' }, (r, define) =>
  define({
    username: r
      .required()
      .minLength(3)
      .remote(
        async name => !(await fetch(`/api/users/${name}`)).ok,
        'Имя пользователя уже занято'
      ),
  })
)
```

## Валидация диапазона дат

```typescript
createForm({ startDate: '', endDate: '' }, (r, define) =>
  define({
    startDate: r.required(),
    endDate: r.required().dateAfter('startDate'),
  })
)
```

## Универсальная форма для создания и редактирования

Одна и та же форма для создания и редактирования. Ключевой момент — при загрузке данных используйте `reset()`, а не `setValues()`, чтобы обновить baseline и `isDirty` оставался `false`.

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

// Загрузка данных: reset() обновляет baseline, форма остаётся чистой
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
      placeholder="Имя"
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
          ? 'Сохранение...'
          : isEditMode
            ? 'Сохранить'
            : 'Создать'
      }}
    </button>
  </form>
</template>
```

## Установка ошибок полям

```typescript
const form = createForm({ username: '', email: '' }, (r, define) =>
  define({
    username: r.required().minLength(3),
    email: r.required().email(),
  })
)

// Установить ошибку для одного поля
form.setErrors({ username: ['Это имя пользователя уже занято'] })

// Установить ошибки для нескольких полей
form.setErrors({
  username: ['Недопустимые символы в имени'],
  email: ['Email уже зарегистрирован', 'Неверный формат email'],
})

// Очистить все ошибки
form.resetErrors()

// Проверить наличие ошибки
if (form.hasError('username')) {
  console.log(form.error('username')) // Первая ошибка
  console.log(form.allErrors('username')) // Все ошибки поля
}
```

Типичный паттерн обработки серверных ошибок — внутри `onSubmit`:

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
        // Сервер возвращает: { fieldErrors: { email: ['Уже существует'] } }
        const { fieldErrors } = await res.json()
        if (fieldErrors) form.setErrors(fieldErrors)
        return
      }

      console.log('Создан:', await res.json())
    },
  }
)
```
