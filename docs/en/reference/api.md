# 📖 API Reference

## `createForm(initialValues, rulesBuilder, options?)`

Creates a reactive form instance with integrated validation.

**Parameters:**

- `initialValues` -Initial form values (supports type inference)
- `rulesBuilder` - A rule builder function `(r, define) => define({...})` or a reactive `computed(() => { const r = createRules(); return {...} })` for i18n support
- `options` - Optional configuration object

**Configuration Options:**

- `onSubmit?` - Callback triggered upon successful form submission
- `onClear?` - Callback triggered when the form is cleared

**Returns:** A form instance with reactive properties and utility methods

**Key Features:**

- Supports nested paths like `'contacts.0.email'`
- Type-safe path construction via `arrayPath()` and `objectPath()`
- Built-in array management: `addArrayItem()`, `removeArrayItem()`, `toggleArrayItem()`
- Automatic performance optimization based on data structure

## Form Properties and Methods

### Reactive State

| Property        | Type                            | Description                                            |
| --------------- | ------------------------------- | ------------------------------------------------------ |
| `values`        | `Ref<T>`                        | Reactive reference to current form values              |
| `val`           | `T`                             | Getter for convenient value access (from script)       |
| `errors`        | `Ref<Record<string, string[]>>` | Validation errors indexed by field name                |
| `touched`       | `Ref<Record<string, boolean>>`  | Tracks which fields have been interacted with          |
| `dirty`         | `Ref<Record<string, boolean>>`  | Tracks which fields have been modified                 |
| `isValidating`  | `Ref<Record<string, boolean>>`  | Indicates fields currently undergoing async validation |
| `isSubmitting`  | `Ref<boolean>`                  | Global form submission status                          |
| `isValid`       | `ComputedRef<boolean>`          | `true` if the entire form is valid                     |
| `isDirty`       | `ComputedRef<boolean>`          | `true` if any field has unsaved changes                |
| `hasAnyErrors`  | `ComputedRef<boolean>`          | `true` if there is at least one validation error       |
| `touchedFields` | `ComputedRef<string[]>`         | List of all touched field paths                        |
| `dirtyFields`   | `ComputedRef<string[]>`         | List of all modified field paths                       |

### Validation Methods

| Method                | Description                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `setRules(rules)`     | Updates validation rules dynamically                                      |
| `validateField(name)` | Manually triggers validation for a specific field (supports nested paths) |
| `validateForm()`      | Triggers validation for all form fields                                   |
| `submit()`            | Validates the form and triggers onSubmit if successful                    |
| `touch(field)`        | Marks a field (flat or nested) as "touched"                               |

### State Management

| Method               | Description                                        |
| -------------------- | -------------------------------------------------- |
| `setValues(values)`  | Updates field values                               |
| `getValues()`        | Returns a deep copy of current values              |
| `clear(useInitial?)` | Clears the form data                               |
| `reset(newValues?)`  | Resets the form to initial or provided values      |
| `resetState()`       | Resets the validation state (touched, dirty, etc.) |
| `setErrors(errors)`  | Manually sets errors for specific fields           |
| `resetErrors()`      | Clears all current validation errors               |

### Field Status Checks

**Unified Methods (compatible with flat and nested paths):**

| Method                  | Returns          | Description                                    |
| ----------------------- | ---------------- | ---------------------------------------------- |
| `hasError(field)`       | `boolean`        | Checks if a field has any errors               |
| `error(field)`          | `string \| null` | Returns the first error message for a field    |
| `allErrors(field)`      | `string[]`       | Returns all error messages for a field         |
| `isTouched(field)`      | `boolean`        | Checks if a field has been touched             |
| `validating(field)`     | `boolean`        | Checks if a field is currently being validated |
| `isFieldDirty(field)`   | `boolean`        | Checks if a field's value has changed          |
| `getFieldStatus(field)` | `FieldStatus`    | Returns the complete status object for a field |

**Usage Examples:**

```typescript
// Standard fields
form.hasError('email')
form.error('name')

// Nested paths
form.hasError('contacts.0.email')
form.error('address.street')

// Type-safe path helpers
form.hasError(form.arrayPath('contacts', 0, 'email'))
form.error(form.objectPath('address', 'street'))
```

### Nested Structure Management

| Method                                   | Description                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `addArrayItem(arrayPath, item)`          | Appends an item to a target array                      |
| `removeArrayItem(arrayPath, index)`      | Removes an item from an array at a specific index      |
| `toggleArrayItem(arrayPath, item)`       | Adds an item if it doesn't exist, otherwise removes it |
| `arrayIncludes(arrayPath, item)`         | Checks if an array contains a specific item            |
| `arrayPath(arrayField, index, property)` | Generates a type-safe path for an array element        |
| `objectPath(objectField, property)`      | Generates a type-safe path for an object property      |

### File Utilities

| Property                    | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `file.{fieldName}.files`    | `ComputedRef<File[]>` - List of selected files           |
| `file.{fieldName}.fileInfo` | `ComputedRef<FileInfo[]>` - Detailed file metadata       |
| `file.{fieldName}.handler`  | `(event: Event) => void` - Event handler for file inputs |
| `file.{fieldName}.clear`    | `() => void` - Resets selected files and the DOM input   |

**Note:** Helpers are lazily initialized. For multiple file selection, ensure the `<input type="file">` has the `multiple` attribute; the library detects this automatically from the input event.

**Important:** The `clear()` method synchronizes the form state with the UI by resetting the actual DOM input element value, preventing "ghost" file names from appearing in the input after they were removed from the form.

### Advanced Methods

| Method               | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `clearCache(field?)` | Clears the validation cache for a specific field or the entire form         |
| `dispose()`          | Stops all watchers and releases resources (called automatically on unmount) |
