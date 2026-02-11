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

        // Очищаем кеш только для самого поля, НЕ для вложенных (participants.*)
        // Вложенные поля проверяются по deepEqual в validateField — если значение не менялось,
        // валидация вернёт кешированный результат. Это ключевая оптимизация для массивов:
        // без неё каждый keystroke в participants[0].name ревалидирует ВСЕ touched nested поля.
        validationManager.clearCacheExact(key)

        if (stateManager.touched[key]) {
          await nextTick()
          await validateField(k)
        }

        // Ревалидируем touched вложенные поля (для wildcard правил типа 'contacts.*.email')
        const prefix = key + '.'
        const touchedNestedFields = Object.keys(stateManager.touched).filter(
          tKey => tKey.startsWith(prefix) && stateManager.touched[tKey]
        )
        if (touchedNestedFields.length > 0) {
          await Promise.all(
            touchedNestedFields.map(f => validateField(f as any))
          )
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
