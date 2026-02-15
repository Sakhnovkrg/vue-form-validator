# Первые шаги {#getting-started}

## Установка {#installation}

### Требования {#prerequisites}

Перед установкой убедитесь, что ваш проект соответствует минимальным версиям зависимостей:
```json
{
  "dependencies": {
    "vue": "^3.2",
    "typescript": "^5.2"
  }
}
```

Выполните установку с помощью любимого менеджера пакетов:

::: code-group

```sh [npm]
$ npm install @sakhnovkrg/vue-form-validator
```

```sh [pnpm]
$ pnpm add @sakhnovkrg/vue-form-validator
```

```sh [yarn]
$ yarn add @sakhnovkrg/vue-form-validator
```

```sh [bun]
$ bun add @sakhnovkrg/vue-form-validator
```

:::

Готово 🚀

## Пример использования

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
      console.log('Форма отправлена:', values)
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
        placeholder="Пароль"
      />
      <span v-if="hasError('password')" class="error">
        {{ error('password') }}
      </span>
    </div>

    <button type="submit" :disabled="!isDirty || !isValid || isSubmitting">
      {{ isSubmitting ? 'Отправка...' : 'Отправить' }}
    </button>
  </form>
</template>
```
