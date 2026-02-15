# ✨ Key Features

- 🚀 **Zero Dependencies** - Lightweight and fast (~6kB gzipped)
- 🦄 **Type Safe** - Full TypeScript support with robust autocompletion
- 📋 **Declarative** - Define your entire form in one place: structure, validation, and submission logic
- 🎯 **Intuitive API** - Simple and clean methods for form management
- 🔄 **Reactive** - Real-time validation powered by Vue's reactivity system
- 🌍 **I18n Support** - Built-in support for reactive localized error messages
- 📂 **File Handling** - Integrated file validation with convenient helpers
- 📝 **Dynamic Arrays** - Native support for validating arrays of objects
- ⚡ **Async Validation** - Remote checks with built-in debouncing
- 🔗 **Cross-field Validation** - Handle field dependencies and value comparisons with ease
- 🎨 **Flexible** - Custom rules and conditional validation logic

## 🎯 Declarative Approach

All form logic is defined within a single `createForm()` call:

```typescript
import { createForm } from '@sakhnovkrg/vue-form-validator'

const form = createForm(
  // 1. Data Structure
  { email: '', password: '' },
  // 2. Validation Rules
  (r, define) =>
    define({
      email: r.required().email(),
      password: r.required().minLength(8),
    }),
  // 3. Event Handlers
  {
    onSubmit: values => {
      /* handle form submission */
    },
  }
)
```

## 🧬 Smart Typing

The library is built with a "Type-First" philosophy. `createForm` supports both flat and deeply nested data structures.

TypeScript ensures field name correctness at every level:

**For primary form fields (Strict Typing):**

```typescript
const form = createForm({
  email: '',
  password: ''
}, ...)

form.error('email')       // ✅ Valid - field exists
form.error('invalid')     // ❌ TypeScript Error - field does not exist
form.hasError('password') // ✅ Valid with autocompletion
```

**For nested arrays and objects (Advanced Typing):**

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

// ❌ TypeScript prevents invalid paths:
form.hasError('contacts.0.invalid') // Compilation error!
form.hasError('address.invalid')    // Compilation error!

// ✅ Use helpers for enhanced autocompletion:
form.hasError(form.arrayPath('contacts', 0, 'name'))   // type-safe autocompletion
form.hasError(form.objectPath('address', 'street'))    // type-safe autocompletion
```

Types are automatically inferred from initial values, providing end-to-end type safety across the entire API.

## ⚡ Supported Data Structures

`createForm` handles all types of data structures out of the box:

- ✅ **Simple Fields** - `string`, `number`, `boolean`, `File`, `File[]`
- ✅ **Arrays of Objects** - Dynamic lists with per-element validation
- ✅ **Nested Objects** - Deeply nested data trees
- ✅ **Mixed Structures** - Any combination of primitives, arrays, and objects
