import { computed, type ComputedRef } from 'vue'
import { toFileArray, formatFileSize } from './helpers'

/**
 * Интерфейс файлового помощника для отдельных полей
 */
export interface FileFieldHelper {
  /** Массив выбранных файлов */
  files: ComputedRef<File[]>
  /** Информация о файлах с форматированным размером */
  fileInfo: ComputedRef<
    Array<{
      name: string
      size: number
      formattedSize: string
      type: string
    }>
  >
  /** Обработчик события выбора файлов */
  handler: (_event: Event) => void
  /** Очистить выбранные файлы */
  clear: () => void
}

/**
 * Извлекает только файловые поля из типа формы
 */
type FileFields<T> = {
  [K in keyof T]: T[K] extends File | File[] | null ? K : never
}[keyof T]

/**
 * Тип файловых помощников с правильным автодополнением только для файловых полей
 */
export type FileHelpers<T extends Record<string, any>> = {
  [K in FileFields<T>]: FileFieldHelper
}

/**
 * Создает обработчик события файлового input с автовалидацией
 */
function createFileHandler<T extends Record<string, any>>(
  form: {
    values: T
    touch: (_field: string | number | symbol) => void
    validateField: (_field: string | number | symbol) => Promise<any> | void
  },
  field: keyof T
) {
  return (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target) return

    const currentValue = (form.values as any)[field]
    const isMultiple = target.multiple || Array.isArray(currentValue)

    if (isMultiple) {
      ;(form.values as any)[field] =
        target.files && target.files.length > 0
          ? Array.from(target.files)
          : null
    } else {
      ;(form.values as any)[field] = target.files?.[0] ?? null
    }

    form.touch(field as string)
    const result = form.validateField(field as string)
    if (result && typeof (result as Promise<any>).then === 'function') {
      void result
    }
  }
}

/**
 * Лениво создает файловые помощники для полей формы
 */
export function createFileHelpers<T extends Record<string, any>>(formContext: {
  values: { value: T }
  touch: (_field: any) => void
  validateField: (_field: any) => Promise<string[]>
}): FileHelpers<T> {
  const helpers = {} as Record<keyof T, FileFieldHelper>

  const ensureHelper = (field: keyof T): FileFieldHelper => {
    let inputRef: HTMLInputElement | null = null

    const fileHandler = createFileHandler(
      {
        values: formContext.values.value,
        touch: f => formContext.touch(f),
        validateField: f => formContext.validateField(f),
      },
      field
    )

    const handler = (event: Event) => {
      // Сохраняем ссылку на input элемент
      inputRef = event.target as HTMLInputElement
      fileHandler(event)
    }

    return {
      files: computed(() =>
        toFileArray((formContext.values.value as any)[field])
      ),
      fileInfo: computed(() => {
        const fileList = toFileArray((formContext.values.value as any)[field])
        return fileList.map(file => ({
          name: file.name,
          size: file.size,
          formattedSize: formatFileSize(file.size),
          type: file.type,
        }))
      }),
      handler,
      clear: () => {
        // Очищаем значение в форме
        ;(formContext.values.value as any)[field] = null

        // Очищаем input элемент если он есть
        if (inputRef) {
          inputRef.value = ''
        }

        formContext.touch(field)
        void formContext.validateField(field)
      },
    }
  }

  return new Proxy(helpers, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver)
      }
      const field = prop as keyof T
      if (!Object.prototype.hasOwnProperty.call(target, field)) {
        target[field] = ensureHelper(field)
      }
      return Reflect.get(target, field, receiver)
    },
  }) as FileHelpers<T>
}
