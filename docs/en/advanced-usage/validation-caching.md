# ⚡ Validation Caching

The library automatically caches validation results to boost performance. The cache is invalidated automatically when:

- A field's value changes
- A field is marked as (`touch`)
- `clearCache(fieldName)` is manually called

## Automatic Cache Invalidation

The cache is automatically cleared within these methods:

- `setValues()` - for all modified fields
- `toggleArrayItem()`, `addArrayItem()`, `removeArrayItem()` - for arrays
- Whenever values are changed via `v-model`

## When to Clear Cache Manually

In most scenarios, the cache is managed automatically. Manual clearing is only required during:

```typescript
// 1. Direct manipulation of reactive data (Not recommended)
form.val.tags.push('newItem') // Use addArrayItem instead
form.clearCache('tags')       // Manual clearing is necessary here

// 2. Rare debugging scenarios
form.clearCache()             // Clear the entire cache
```

**Recommendation**: Always use built-in methods (`setValues`, `addArrayItem`, etc.) as they handle cache management out of the box.

**Real-world issue example**: If you remove elements from an array using `splice()` directly, the cache might retain stale validation results. To fix this, use `removeArrayItem()` or clear the cache manually.
