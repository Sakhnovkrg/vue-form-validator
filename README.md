# Vue Form Validator

Современная, типобезопасная библиотека валидации форм для Vue 3 с интуитивным API и мощными возможностями.

⚠️ **Библиотека находится в разработке**

## [Демо](https://sakhnovkrg.github.io/vue-form-validator/)

## ✨ Основные возможности

- 🚀 **Без зависимостей** - Легкая и быстрая (~6kB gzipped)
- 🦄 **Типобезопасность** - Полная поддержка TypeScript с автодополнением
- 📋 **Декларативность** - Вся форма определяется в одном месте: структура, валидация и обработка
- 🎯 **Интуитивный API** - Простые и понятные методы для работы с формами
- 🔄 **Реактивность** - Валидация в реальном времени с реактивностью Vue
- 🌍 **Интернационализация** - Поддержка реактивных сообщений об ошибках
- 📂 **Загрузка файлов** - Встроенная валидация файлов с хелперами
- 📝 **Динамические массивы** - Поддержка валидации массивов объектов
- ⚡ **Асинхронная валидация** - Удаленная валидация с debouncing
- 🔗 **Кросс-полевая валидация** - Зависимости полей и сравнения
- 🎨 **Гибкость** - Кастомные правила и условная валидация

## 🧬 Умная типизация

Библиотека спроектирована с особым вниманием к типобезопасности. `createForm` поддерживает как простые, так и вложенные структуры данных.

TypeScript контролирует корректность имен полей на всех уровнях:

**Для основных полей формы (строгая типизация):**

```typescript
const form = createForm({
  email: '',
  password: ''
}, ...)

form.error('email')    // ✅ Корректно - поле существует
form.error('invalid')  // ❌ Ошибка TypeScript - поле не существует
form.hasError('password') // ✅ Корректно с автодополнением
```

**Для вложенных полей массивов и объектов (продвинутая типизация):**

```typescript
const form = createForm({
  contacts: [{ name: '', email: '' }],
  address: { street: '', city: '' }
}, ...)

// ✅ TypeScript автоматически выводит допустимые пути:
form.hasError('contacts.0.name')    // contacts.${number}.name
form.hasError('contacts.0.email')   // contacts.${number}.email
form.hasError('address.street')     // address.street
form.hasError('address.city')       // address.city

// ❌ TypeScript не позволит указать несуществующие пути:
form.hasError('contacts.0.invalid') // Ошибка компиляции!
form.hasError('address.invalid')    // Ошибка компиляции!

// ✅ Для автодополнения используйте helper'ы:
form.hasError(form.arrayPath('contacts', 0, 'name'))   // автодополнение
form.hasError(form.objectPath('address', 'street'))    // автодополнение
```

Типы автоматически выводятся из начальных значений, обеспечивая полную типобезопасность на всех уровнях API.

## ⚡ Поддерживаемые структуры данных

`createForm` поддерживает все типы структур данных:

- ✅ **Простые поля** - `string`, `number`, `boolean`, `File`, `File[]`
- ✅ **Массивы объектов** - динамические списки с валидацией элементов
- ✅ **Вложенные объекты** - многоуровневые структуры данных
- ✅ **Смешанные структуры** - комбинации простых полей, массивов и объектов

## 📦 Установка

```bash
npm install @sakhnovkrg/vue-form-validator
```

## 🚀 Быстрый старт

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

## 🎯 Декларативный подход

Вся логика формы определяется в одном вызове `createForm()`:

```typescript
import { createForm } from '@sakhnovkrg/vue-form-validator'

const form = createForm(
  // 1. Структура данных
  { email: '', password: '' },
  // 2. Правила валидации
  (r, define) =>
    define({
      email: r.required().email(),
      password: r.required().minLength(8),
    }),
  // 3. Обработчики событий
  {
    onSubmit: values => {
      /* отправка формы */
    },
  }
)
```

**Преимущества:**

- ✅ Никаких отдельных схем или разбросанной логики
- ✅ TypeScript автоматически выводит типы из определения
- ✅ Вся форма видна в одном месте - легко понимать и поддерживать
- ✅ Меньше boilerplate кода

## 🌍 Интернационализация (i18n)

Для интернационализации вам понадобится **реактивный подход** с `computed()`, который автоматически обновляет сообщения об ошибках при смене языка.

### Обычный подход (без i18n)

```typescript
// Простой и быстрый - для форм с фиксированными сообщениями
const form = createForm(initialValues, (r, define) =>
  define({
    email: r.required('Email обязателен').email('Неверный формат'),
  })
)
```

### Реактивный подход (с i18n)

```typescript
// Реактивные сообщения - обновляются при смене языка
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

**Полный пример с vue-i18n:**

```vue
<script setup lang="ts">
import { createForm, createRules } from '@sakhnovkrg/vue-form-validator'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

const form = createForm(
  { username: '', email: '', password: '' },
  // вместо (r, define) => ...
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
    <!-- .values и .val — взаимозаменяемы, .val удобнее в script -->
    <input v-model="form.values.username" @blur="form.touch('username')" />
    <span v-if="form.hasError('username')">{{ form.error('username') }}</span>

    <input v-model="form.values.email" @blur="form.touch('email')" />
    <span v-if="form.hasError('email')">{{ form.error('email') }}</span>

    <!-- Остальные поля... -->
  </form>
</template>
```

## 📖 Справочник API

### `createForm(initialValues, rulesBuilder, options?)`

Создает реактивную форму с валидацией.

**Параметры:**

- `initialValues` - Начальные значения формы (поддерживает вывод типов)
- `rulesBuilder` - Функция-строитель правил `(r, define) => define({...})` или реактивный computed `computed(() => { const r = createRules(); return {...} })` для i18n
- `options` - Дополнительные настройки

**Настройки:**

- `onSubmit?` - Обработчик отправки формы
- `onClear?` - Обработчик очистки формы

**Возвращает:** Экземпляр формы с реактивными свойствами и методами

**Поддерживаемые возможности:**

- Поддержка вложенных путей типа `'contacts.0.email'`
- Методы `arrayPath()` и `objectPath()` для типобезопасного построения путей
- Управление массивами: `addArrayItem()`, `removeArrayItem()`, `toggleArrayItem()`
- Автоматическая оптимизация в зависимости от структуры данных

### Свойства и методы формы

#### Реактивное состояние

| Свойство        | Тип                             | Описание                                           |
| --------------- | ------------------------------- | -------------------------------------------------- |
| `values`        | `Ref<T>`                        | Текущие значения формы (реактивный ref)            |
| `val`           | `T`                             | Геттер для удобного доступа к значениям (в script) |
| `errors`        | `Ref<Record<string, string[]>>` | Ошибки валидации по полям                          |
| `touched`       | `Ref<Record<string, boolean>>`  | Состояние "тронутости" полей                       |
| `dirty`         | `Ref<Record<string, boolean>>`  | Измененные поля                                    |
| `isValidating`  | `Ref<Record<string, boolean>>`  | Поля в процессе валидации                          |
| `isSubmitting`  | `Ref<boolean>`                  | Статус отправки формы                              |
| `isValid`       | `ComputedRef<boolean>`          | Валидность всей формы                              |
| `isDirty`       | `ComputedRef<boolean>`          | Наличие несохраненных изменений                    |
| `hasAnyErrors`  | `ComputedRef<boolean>`          | Наличие ошибок в форме                             |
| `touchedFields` | `ComputedRef<string[]>`         | Список "тронутых" полей                            |
| `dirtyFields`   | `ComputedRef<string[]>`         | Список измененных полей                            |

#### Методы валидации

| Метод                 | Описание                                             |
| --------------------- | ---------------------------------------------------- |
| `setRules(rules)`     | Установить правила валидации                         |
| `validateField(name)` | Валидировать поле (обычное или вложенное)            |
| `validateForm()`      | Валидировать всю форму                               |
| `submit()`            | Отправить форму после валидации                      |
| `touch(field)`        | Отметить поле как "тронутое" (обычное или вложенное) |

#### Управление состоянием

| Метод                | Описание                             |
| -------------------- | ------------------------------------ |
| `setValues(values)`  | Обновить значения полей              |
| `getValues()`        | Получить копию текущих значений      |
| `clear(useInitial?)` | Очистить форму                       |
| `reset(newValues?)`  | Сбросить форму к начальным значениям |
| `resetState()`       | Сбросить состояние валидации         |
| `setErrors(errors)`  | Установить ошибки для полей          |
| `resetErrors()`      | Очистить все ошибки                  |

#### Проверка состояния полей

**Унифицированные методы (работают с обычными и вложенными полями):**

| Метод                   | Возврат          | Описание                           |
| ----------------------- | ---------------- | ---------------------------------- |
| `hasError(field)`       | `boolean`        | Есть ли ошибки в поле              |
| `error(field)`          | `string \| null` | Первая ошибка поля                 |
| `allErrors(field)`      | `string[]`       | Все ошибки поля                    |
| `isTouched(field)`      | `boolean`        | Было ли поле "тронуто"             |
| `validating(field)`     | `boolean`        | Валидируется ли поле               |
| `isFieldDirty(field)`   | `boolean`        | Изменено ли поле                   |
| `getFieldStatus(field)` | `FieldStatus`    | Полная информация о состоянии поля |

**Примеры использования:**

```typescript
// Обычные поля
form.hasError('email')
form.error('name')

// Вложенные пути
form.hasError('contacts.0.email')
form.error('address.street')

// С автодополнением через helper'ы
form.hasError(form.arrayPath('contacts', 0, 'email'))
form.error(form.objectPath('address', 'street'))
```

#### Работа с вложенными структурами

| Метод                                    | Описание                                         |
| ---------------------------------------- | ------------------------------------------------ |
| `addArrayItem(arrayPath, item)`          | Добавить элемент в массив                        |
| `removeArrayItem(arrayPath, index)`      | Удалить элемент из массива                       |
| `toggleArrayItem(arrayPath, item)`       | Переключить элемент в массиве (добавить/удалить) |
| `arrayIncludes(arrayPath, item)`         | Проверить содержится ли элемент в массиве        |
| `arrayPath(arrayField, index, property)` | Построить типобезопасный путь к элементу массива |
| `objectPath(objectField, property)`      | Построить типобезопасный путь к свойству объекта |

#### Файловые утилиты

| Свойство                    | Описание                                            |
| --------------------------- | --------------------------------------------------- |
| `file.{fieldName}.files`    | `ComputedRef<File[]>` - Список файлов               |
| `file.{fieldName}.fileInfo` | `ComputedRef<FileInfo[]>` - Информация о файлах     |
| `file.{fieldName}.handler`  | `(event: Event) => void` - Обработчик выбора файлов |
| `file.{fieldName}.clear`    | `() => void` - Очистить выбранные файлы и DOM input |

**Note:** Helpers создаются лениво при первом обращении. Для множественного выбора установите `multiple` на `<input type="file">` — библиотека определит это автоматически по событию ввода.

**Важно:** Метод `clear()` полностью очищает файловые поля - как значение в форме, так и визуальное отображение в DOM input элементе. Это предотвращает ситуацию, когда после `clear()` файл исчезает из формы, но остается отображаться в input.

#### Продвинутые методы

| Метод                | Описание                                                  |
| -------------------- | --------------------------------------------------------- |
| `clearCache(field?)` | Очистить кэш валидации (поля или весь кэш)                |
| `dispose()`          | Остановить watchers и очистить ресурсы (авто при unmount) |

## 🛠️ Встроенные правила валидации

### Базовые правила

```typescript
r.required('Кастомное сообщение') // Обязательное поле
r.email() // Валидный email
r.minLength(5) // Минимальная длина
r.maxLength(100) // Максимальная длина
r.numeric() // Только цифры
r.regex(/pattern/, 'сообщение') // Кастомный regex
r.oneOf(['a', 'b', 'c']) // Должно быть одним из значений
```

### Числовые правила

```typescript
r.minValue(0) // Минимальное значение
r.maxValue(100) // Максимальное значение
r.between(0, 100) // Диапазон значений
```

### Кросс-полевые правила

```typescript
r.sameAs('password') // Должно совпадать с другим полем
r.dateAfter('startDate') // Дата должна быть после другого поля
r.requiredIf('type', 'business') // Обязательно при условии
```

### Правила файлов

```typescript
r.fileRequired() // Выбор файла обязателен
r.fileSize(5 * 1024 * 1024) // Максимальный размер файла (5MB)
r.fileType(['.jpg', '.png']) // Разрешенные типы файлов
r.fileCount(1, 5) // Диапазон количества файлов
```

### Правила массивов

```typescript
r.arrayRequired() // Проверяет, что значение — массив и в нём есть хотя бы один элемент
r.arrayMinLength(1) // Минимальная длина массива
r.arrayMaxLength(10) // Максимальная длина массива
```

**Примечание**: `arrayRequired()` и `arrayMinLength(1)` работают одинаково, но `arrayRequired()` предоставляет более семантичное название для обязательных массивов.

### Продвинутые правила

```typescript
// Удаленная валидация с debouncing
r.remote(
  async username => {
    const response = await fetch(`/api/check-username/${username}`)
    return response.ok
  },
  'Имя пользователя уже занято',
  500
)

// Кастомная валидация
r.custom((value, allValues) => {
  return value.includes(allValues.domain)
}, 'Неверный формат')
```

## 📂 Загрузка файлов

### Конфигурация

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

### Использование

```vue
<template>
  <!-- Один файл -->
  <input type="file" @change="form.file.avatar.handler" />
  <div v-if="form.file.avatar.files.value.length">
    Выбран: {{ form.file.avatar.fileInfo.value[0]?.name }}
    <button @click="form.file.avatar.clear()">Удалить</button>
  </div>

  <!-- Множественные файлы -->
  <input type="file" multiple @change="form.file.documents.handler" />
  <div v-if="form.file.documents.files.value.length">
    <p>Файлов: {{ form.file.documents.files.value.length }}</p>
    <ul>
      <li v-for="file in form.file.documents.fileInfo.value" :key="file.name">
        {{ file.name }} ({{ file.formattedSize }})
      </li>
    </ul>
    <button @click="form.file.documents.clear()">Очистить все</button>
  </div>
</template>
```

## 📝 Вложенные структуры данных

Библиотека поддерживает валидацию динамических массивов и вложенных объектов с типобезопасным API.

### Динамические массивы

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

// Управление массивом
form.addArrayItem('contacts', { name: '', email: '', role: '' })
form.removeArrayItem('contacts', index)
```

**Пример компонента:**

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

    <button @click="form.removeArrayItem('contacts', index)">Удалить</button>
  </div>

  <button
    @click="form.addArrayItem('contacts', { name: '', email: '', role: '' })"
  >
    Добавить контакт
  </button>
</template>
```

### Вложенные объекты

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
    'address.zipCode': r.required().regex(/^\d{5}$/, 'ZIP: 5 цифр'),
    'profile.bio': r.maxLength(200),
    'profile.website': r.regex(/^https?:\/\/.+/, 'Начните с http://'),
  })
)
```

**Пример компонента:**

```vue
<template>
  <fieldset>
    <legend>Адрес</legend>

    <!-- Строковые пути — просто и наглядно -->
    <input
      v-model="form.values.address.street"
      @blur="form.touch('address.street')"
    />
    <span v-if="form.hasError('address.street')">{{
      form.error('address.street')
    }}</span>

    <!-- objectPath() — с автодополнением TypeScript -->
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

## 🎯 Продвинутые примеры

### Условная валидация

```typescript
createForm({ type: '', companyName: '' }, (r, define) =>
  define({
    type: r.required().oneOf(['personal', 'business']),
    companyName: r.requiredIf('type', 'business'),
  })
)
```

### Асинхронная проверка имени пользователя

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

### Валидация диапазона дат

```typescript
createForm({ startDate: '', endDate: '' }, (r, define) =>
  define({
    startDate: r.required(),
    endDate: r.required().dateAfter('startDate'),
  })
)
```

### Универсальная форма для создания и редактирования

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

### Установка ошибок полям

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

## ⚡ Кэширование валидации

Библиотека автоматически кэширует результаты валидации для повышения производительности. Кэш очищается автоматически при:

- Изменении значения поля
- Отметке поля как затронутого (`touch`)
- Вызове `clearCache(fieldName)`

### Автоматическая очистка кэша

Кэш очищается автоматически в этих методах:

- `setValues()` - для всех изменяемых полей
- `toggleArrayItem()`, `addArrayItem()`, `removeArrayItem()` - для массивов
- При изменении значений через `v-model`

### Когда нужно очищать кэш вручную

В большинстве случаев кэш очищается автоматически. Ручная очистка нужна только при:

```typescript
// Прямых манипуляциях с реактивными данными (не рекомендуется)
form.val.tags.push('newItem') // вместо этого используйте addArrayItem
form.clearCache('tags') // в таких случаях нужна ручная очистка

// Крайне редких случаях отладки
form.clearCache() // очистить весь кэш
```

**Рекомендация**: Используйте встроенные методы (`setValues`, `addArrayItem`, etc.) - они автоматически управляют кэшем.

**Пример реальной проблемы**: При удалении всех элементов из массива через `splice()` напрямую, кэш может содержать старый результат валидации. Решение - использовать `removeArrayItem()` или очистить кэш вручную.

## 🧪 Разработка

### Запуск playground

```bash
npm run dev
```

Открывает development playground с живыми примерами на `http://localhost:3000`

### Тесты

```bash
npm test                  # Запустить тесты
npm run test -- --coverage # Запустить тесты с покрытием
```

### Сборка

```bash
npm run build             # Собрать библиотеку и типы
npm run build:playground  # Собрать playground для деплоя
npm run preview           # Предпросмотр собранного playground
```
