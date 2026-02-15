# Getting Started

## Installation

### Prerequisites

Before installation, ensure that your project meets the minimum dependency versions:
```json
{
  "dependencies": {
    "vue": "^3.2",
    "typescript": "^5.2"
  }
}
```

Install with your favorite package manager:

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

All set 🚀

## Usage

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
      console.log('Form has sent:', values)
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
      {{ isSubmitting ? 'Sending...' : 'Send' }}
    </button>
  </form>
</template>
```
