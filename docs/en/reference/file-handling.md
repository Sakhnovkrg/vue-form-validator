# 📂 File Uploads

## Configuration

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

## Usage

```vue
<template>
  <!-- Single file -->
  <input type="file" @change="form.file.avatar.handler" />
  <div v-if="form.file.avatar.files.value.length">
    Selected: {{ form.file.avatar.fileInfo.value[0]?.name }}
    <button @click="form.file.avatar.clear()">Remove</button>
  </div>

  <!-- FileList -->
  <input type="file" multiple @change="form.file.documents.handler" />
  <div v-if="form.file.documents.files.value.length">
    <p>Files selected: {{ form.file.documents.files.value.length }}</p>
    <ul>
      <li v-for="file in form.file.documents.fileInfo.value" :key="file.name">
        {{ file.name }} ({{ file.formattedSize }})
      </li>
    </ul>
    <button @click="form.file.documents.clear()">Clear all</button>
  </div>
</template>
```
