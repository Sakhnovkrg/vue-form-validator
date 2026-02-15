# 📝 Nested Data Structures

The library supports the validation of dynamic arrays and nested objects with a fully type-safe API.

## Dynamic Arrays

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
    // Wildcard notation for array elements
    'contacts.*.name': r.required(),
    'contacts.*.email': r.required().email(),
    'contacts.*.role': r.required(),
  })
)

// Array management
form.addArrayItem('contacts', { name: '', email: '', role: '' })
form.removeArrayItem('contacts', index)
```

**Component Example:**

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

    <button @click="form.removeArrayItem('contacts', index)">Delete</button>
  </div>

  <button
    @click="form.addArrayItem('contacts', { name: '', email: '', role: '' })"
  >
    Add Contact
  </button>
</template>
```

## Nested Objects

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
    'profile.website': r.regex(/^https?:\/\/.+/, 'Must start with http://'),
  })
)
```

**Component Example:**

```vue
<template>
  <fieldset>
    <legend>Address</legend>

    <input
      v-model="form.values.address.street"
      @blur="form.touch('address.street')"
    />
    <span v-if="form.hasError('address.street')">
      {{ form.error('address.street') }}
    </span>

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