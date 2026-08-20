# 🛠️ Built-in Validation Rules

## Base Rules

```typescript
r.required('Custom message')      // Field is mandatory
r.email()                         // Valid email format
r.minLength(5)                    // Minimum string length
r.maxLength(100)                  // Maximum string length
r.numeric()                       // Only digits allowed
r.regex(/pattern/, 'message')     // Custom regex pattern
r.oneOf(['a', 'b', 'c'])          // Must be one of the specified values
```

## Numeric Rules

```typescript
r.minValue(0)                     // Minimum value
r.maxValue(100)                   // Maximum value
r.between(0, 100)                 // Inclusive range of values
```

## Cross-field Rules

```typescript
r.sameAs('password')              // Must match another field's value
r.dateAfter('startDate')          // Date must be after another field's date
r.requiredIf('type', 'business')  // Required if another field matches a specific value
```

## File Rules

```typescript
r.fileRequired()                  // File selection is mandatory
r.fileSize(5 * 1024 * 1024)       // Maximum file size (5MB)
r.fileType(['.jpg', '.png'])      // Allowed file extensions
r.fileCount(1, 5)                 // Range for number of files
```

The limit and the type list can be **reactive** — a `ref`, a `computed` or a getter.
The value is resolved at validation time rather than when the rule is created, so
a rule survives data that arrives later (the user's plan) as well as a dependency
on another form field:

```typescript
r.fileSize(() => limits.value.preset) // limit comes with the profile
r.fileType(allowedExtensions) // ref/computed: depends on the selected kind
r.fileType('.mp3') // a single type can be passed as a string
```

### Re-validating a field

`validateField(name)` uses a cache: the result is keyed by the field value and by the values
of the fields it depends on. When a rule looks **outside the form** — a limit from the user's
profile, a list from a dictionary — that dependency is not part of the key, so a plain call
returns the previous result. Use `force` for this case:

```typescript
watch(instrumentId, () => {
  form.validateField('file', { force: true })
})
```

## Array Rules

```typescript
r.arrayRequired()                 // Checks if value is an array with at least one element
r.arrayMinLength(1)               // Minimum array length
r.arrayMaxLength(10)              // Maximum array length
```

**Note**: `arrayRequired()` and `arrayMinLength(1)` function identically, but `arrayRequired()` provides a more semantic name for mandatory arrays.

## Advanced Rules

```typescript
// Remote validation with debouncing
r.remote(
  async username => {
    const response = await fetch(`/api/check-username/${username}`)
    return response.ok
  },
  'Username is already taken',
  500
)

// Custom validation
r.custom((value, allValues) => {
  return value.includes(allValues.domain)
}, 'Invalid format')
```