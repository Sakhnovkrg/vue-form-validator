import { createRules } from '../rules'
import { defineRules } from '../utils/helpers'
import { createForm as createFormInternal } from './core'
import type { FormOptions } from './types'
import type { FormRules } from './types'
import type { ComputedRef } from 'vue'
import { watch } from 'vue'

/**
 * Создает форму с поддержкой как простых, так и вложенных полей
 * @param initialValues - Начальные значения для полей формы
 * @returns Экземпляр формы с автоматической типизацией
 */
export function createForm<T extends Record<string, any>>(
  initialValues: T
): ReturnType<typeof createFormInternal<T>>

/**
 * Создает форму с правилами валидации
 * @template T - Тип значений формы
 * @param initialValues - Начальные значения для полей формы
 * @param rulesOrBuilder - Колбэк-строитель правил или computed ref с правилами
 * @param options - Опциональная конфигурация формы (колбэки onSubmit, onClear)
 * @returns Экземпляр формы с реактивным состоянием и методами валидации
 */
export function createForm<
  T extends Record<string, any>,
  R extends FormRules<T> = FormRules<T>,
>(
  initialValues: T,
  rulesOrBuilder:
    | ((
        _r: ReturnType<typeof createRules>,
        _define: ReturnType<typeof defineRules<T>>
      ) => R)
    | ComputedRef<R>,
  options?: Omit<FormOptions<T>, 'initialValues'>
): ReturnType<typeof createFormInternal<T>>

export function createForm<T extends Record<string, any>>(
  initialValues: T,
  rulesOrBuilder?:
    | ((
        _r: ReturnType<typeof createRules>,
        _define: ReturnType<typeof defineRules<T>>
      ) => FormRules<T>)
    | ComputedRef<FormRules<T>>,
  options?: Omit<FormOptions<T>, 'initialValues'>
): ReturnType<typeof createFormInternal<T>> {
  const form = createFormInternal<T>({ initialValues, ...options })

  // Если правила не переданы, возвращаем форму без валидации
  if (!rulesOrBuilder) {
    return form
  }

  if (typeof rulesOrBuilder === 'function') {
    // Traditional function-based rules
    const rules = createRules()
    const define = defineRules<T>()
    const formRules = rulesOrBuilder(rules, define)
    form.setRules(formRules)
  } else {
    // Computed reactive rules
    const computedRules = rulesOrBuilder
    form.setRules(computedRules.value)

    // Watch for changes in computed rules and update form
    const stopRulesWatch = watch(
      computedRules,
      async newRules => {
        // setRules автоматически очистит ошибки полей, удалённых из правил
        form.setRules(newRules)

        // Собираем ВСЕ поля с ошибками (включая nested вроде 'contacts.0.email')
        const fieldsWithErrors: string[] = []
        const currentErrors = form.errors.value
        for (const key of Object.keys(currentErrors)) {
          if (currentErrors[key]?.length > 0) {
            fieldsWithErrors.push(key)
          }
        }

        // Очищаем кэш валидации для принудительной свежей валидации
        form.clearCache()

        // Ревалидируем все поля с ошибками параллельно для обновления сообщений об ошибках
        await Promise.all(
          fieldsWithErrors.map(field => form.validateField(field as any))
        )
      },
      { deep: true }
    )

    // Patch dispose to also stop the rules watcher
    const originalDispose = form.dispose
    form.dispose = () => {
      stopRulesWatch()
      originalDispose()
    }
  }

  return form
}

// Экспортируем основные типы
export type {
  FormInstance,
  FormRules,
  NestedPaths,
  FormOptions,
  Rule,
  RuleChain,
  FieldStatus,
} from './types'

// Экспортируем функции создания правил
export { createRules } from '../rules'
