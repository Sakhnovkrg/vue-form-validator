# 🛠️ Встроенные правила валидации

## Базовые правила

```typescript
r.required('Кастомное сообщение') // Обязательное поле
r.email() // Валидный email
r.minLength(5) // Минимальная длина
r.maxLength(100) // Максимальная длина
r.numeric() // Только цифры
r.regex(/pattern/, 'сообщение') // Кастомный regex
r.oneOf(['a', 'b', 'c']) // Должно быть одним из значений
```

## Числовые правила

```typescript
r.minValue(0) // Минимальное значение
r.maxValue(100) // Максимальное значение
r.between(0, 100) // Диапазон значений
```

## Кросс-полевые правила

```typescript
r.sameAs('password') // Должно совпадать с другим полем
r.dateAfter('startDate') // Дата должна быть после другого поля
r.requiredIf('type', 'business') // Обязательно при условии
```

## Правила файлов

```typescript
r.fileRequired() // Выбор файла обязателен
r.fileSize(5 * 1024 * 1024) // Максимальный размер файла (5MB)
r.fileType(['.jpg', '.png']) // Разрешенные типы файлов
r.fileCount(1, 5) // Диапазон количества файлов
```

Лимит и список типов могут быть **реактивными** — `ref`, `computed` или геттер.
Значение разрешается в момент проверки, а не при создании правила, поэтому
правило переживает и приезжающие позже данные (тариф пользователя), и зависимость
от другого поля формы:

```typescript
r.fileSize(() => limits.value.preset) // лимит приезжает с профилем
r.fileType(allowedExtensions) // ref/computed: зависит от выбранного типа
r.fileType('.mp3') // один тип можно передать строкой
```

## Правила массивов

```typescript
r.arrayRequired() // Проверяет, что значение — массив и в нём есть хотя бы один элемент
r.arrayMinLength(1) // Минимальная длина массива
r.arrayMaxLength(10) // Максимальная длина массива
```

**Примечание**: `arrayRequired()` и `arrayMinLength(1)` работают одинаково, но `arrayRequired()` предоставляет более семантичное название для обязательных массивов.

## Продвинутые правила

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