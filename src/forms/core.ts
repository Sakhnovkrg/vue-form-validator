import { nextTick, effectScope, onScopeDispose, getCurrentScope } from 'vue'
import type { FormOptions, NestedPaths, FormInstance, FormRules } from './types'
import { FormStateManager } from '../validation/state'
import { ValidationManager } from '../validation/manager'
import { createFileHelpers } from '../utils/fileHelpers'
import { normalizeFormRules } from './normalizeRules'
import { useFieldWatchers } from './useFieldWatchers'
import { useArrayHelpers } from './useArrayHelpers'

/**
 * Создает универсальную форму с поддержкой как простых, так и вложенных полей
 */
export function createForm<T extends Record<string, any>>(
  options: FormOptions<T>
): FormInstance<T> {
  // Создаём собственный effectScope для автоматической очистки watchers/computed
  // при уничтожении родительского scope (например, при unmount компонента)
  const parentScope = getCurrentScope()
  const scope = effectScope()

  const instance = scope.run(() => {
    const stateManager = new FormStateManager<T>(options)
    const validationManager = new ValidationManager<T>(
      stateManager.values,
      stateManager.errors,
      stateManager.isValidating
    )

    // --- Validation methods ---

    function setRules(rules: FormRules<T>) {
      const normalized = normalizeFormRules<T, FormRules<T>>(rules)
      validationManager.setRules(normalized)
      stateManager.setRules(normalized as any)
    }

    async function validateField<K extends keyof T>(name: K): Promise<string[]>
    async function validateField<P extends NestedPaths<T>>(
      path: P
    ): Promise<string[]>
    async function validateField(
      key: keyof T | NestedPaths<T>
    ): Promise<string[]> {
      return validationManager.validateField(key as any)
    }

    async function validateForm(): Promise<boolean> {
      return validationManager.validateForm(stateManager.touched)
    }

    async function submit(): Promise<void> {
      if (stateManager.isSubmitting.value) return
      stateManager.isSubmitting.value = true
      try {
        const isValid = await validateForm()
        if (isValid && options.onSubmit) {
          await nextTick()
          await options.onSubmit(stateManager.getValues())
        }
      } finally {
        stateManager.isSubmitting.value = false
      }
    }

    function touch<K extends keyof T>(name: K): void
    function touch<P extends NestedPaths<T>>(path: P): void
    function touch(key: keyof T | NestedPaths<T>): void {
      stateManager.touched[key as string] = true
      void validateField(key as any)
    }

    // --- Composables ---

    const { stopAll } = useFieldWatchers(
      stateManager,
      validationManager,
      validateField
    )
    const arrays = useArrayHelpers(
      stateManager,
      validationManager,
      validateField
    )
    const stateRefs = stateManager.getStateRefs()
    const fileHelpers = createFileHelpers({
      values: stateRefs.values,
      touch: (field: any) => touch(field),
      validateField: (field: any) => validateField(field),
    })

    function dispose() {
      stopAll()
      validationManager.dispose()
      scope.stop()
    }

    // --- Return form instance ---

    return {
      // Reactive state refs
      values: stateRefs.values as import('vue').Ref<T>,
      errors: stateRefs.errors,
      touched: stateRefs.touched,
      dirty: stateRefs.dirty,
      isValidating: stateRefs.isValidating,

      // Computed props
      isValid: stateManager.isValid,
      isDirty: stateManager.isDirty,
      hasAnyErrors: stateManager.hasAnyErrors,
      touchedFields: stateManager.touchedFields,
      dirtyFields: stateManager.dirtyFields,
      isSubmitting: stateManager.isSubmitting,

      // Validation
      setRules,
      validateField,
      validateForm,
      submit,
      touch,

      // State management
      clear: (useInitial?: boolean) => {
        validationManager.abortAll()
        validationManager.clearCache()
        stateManager.clear(useInitial)
      },
      reset: (newValues?: Partial<T>) => {
        validationManager.abortAll()
        validationManager.clearCache()
        stateManager.reset(newValues)
      },
      resetState: () => {
        validationManager.abortAll()
        validationManager.clearCache()
        stateManager.resetState()
      },
      setValues: (newValues: Partial<T>) => {
        Object.keys(newValues).forEach(key => {
          validationManager.clearCache(key)
        })
        stateManager.setValues(newValues)
      },
      getValues: stateManager.getValues.bind(stateManager),
      setErrors: stateManager.setErrors.bind(stateManager),
      resetErrors: () => {
        validationManager.abortAll()
        validationManager.clearCache()
        stateManager.resetErrors()
      },

      // Field status
      hasError: stateManager.hasError.bind(stateManager),
      error: stateManager.error.bind(stateManager),
      allErrors: stateManager.allErrors.bind(stateManager),
      isTouched: stateManager.isTouched.bind(stateManager),
      validating: stateManager.validating.bind(stateManager),
      isFieldDirty: stateManager.isFieldDirty.bind(stateManager),
      getFieldStatus: stateManager.getFieldStatus.bind(stateManager),

      // File helpers
      file: fileHelpers as import('../utils/fileHelpers').FileHelpers<T>,

      // Direct access
      get val(): T {
        return stateManager.values as T
      },

      // Array helpers
      ...arrays,

      // Advanced
      clearCache: validationManager.clearCache.bind(validationManager),
      dispose,
    }
  })!

  // Регистрируем auto-cleanup на родительском scope (вне inner effectScope),
  // чтобы при unmount компонента форма автоматически очищалась
  if (parentScope) {
    onScopeDispose(() => instance.dispose())
  }

  return instance
}
