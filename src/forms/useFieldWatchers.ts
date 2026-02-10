import { watch, nextTick } from 'vue'
import type { FormStateManager } from '../validation/state'
import type { ValidationManager } from '../validation/manager'

export function useFieldWatchers<T extends Record<string, any>>(
  stateManager: FormStateManager<T>,
  validationManager: ValidationManager<T>,
  validateField: (_key: any) => Promise<string[]>
): { stopAll: () => void } {
  const stops: Array<() => void> = []

  Object.keys(stateManager.values).forEach(key => {
    const k = key as keyof T

    const stop = watch(
      () => stateManager.values[k],
      async (newValue, oldValue) => {
        if (typeof newValue !== 'object' && newValue === oldValue) return

        stateManager.markDirty(key, newValue)
        validationManager.clearCache(key)

        if (stateManager.touched[key]) {
          await nextTick()
          await validateField(k)
        }

        // Ревалидируем touched вложенные поля (для wildcard правил типа 'contacts.*.email')
        const prefix = key + '.'
        const touchedNestedFields = Object.keys(stateManager.touched).filter(
          tKey => tKey.startsWith(prefix) && stateManager.touched[tKey]
        )
        for (const nestedField of touchedNestedFields) {
          await validateField(nestedField as any)
        }

        await validationManager.validateDependentFields(
          key,
          stateManager.touched
        )
      },
      { flush: 'post', deep: true }
    )
    stops.push(stop)
  })

  return {
    stopAll: () => {
      stops.forEach(s => s())
      stops.length = 0
    },
  }
}
