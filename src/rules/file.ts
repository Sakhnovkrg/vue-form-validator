import type { MaybeRefOrGetter } from 'vue'
import type { Rule } from '../forms/types'
import { resolveMessage, toFileArray } from '../utils/helpers'

/**
 * Правило обязательного файла
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function fileRequired(
  msg: MaybeRefOrGetter<string> = 'Please select a file'
): Rule<FileList | File | File[] | null> {
  return files => {
    const message = resolveMessage(msg)
    if (!files) return message

    if (typeof FileList !== 'undefined' && files instanceof FileList) {
      return files.length > 0 ? null : message
    }

    if (Array.isArray(files)) {
      return files.length > 0 ? null : message
    }

    const isFile = typeof File !== 'undefined' && files instanceof File
    return isFile ? null : message
  }
}

/**
 * Правило максимального размера файла
 * @param maxSizeInBytes - Максимальный размер файла в байтах
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function fileSize(
  maxSizeInBytes: number,
  msg?: MaybeRefOrGetter<string>
): Rule<FileList | File | File[] | null> {
  if (maxSizeInBytes <= 0) {
    throw new Error('Maximum file size must be greater than 0')
  }

  return files => {
    if (!files) return null

    const filesToCheck = toFileArray(files)

    const oversizedFile = filesToCheck.find(file => file.size > maxSizeInBytes)

    if (oversizedFile) {
      const maxSizeMB = (maxSizeInBytes / (1024 * 1024)).toFixed(1)
      const message = resolveMessage(msg)
      return (
        message ||
        `File "${oversizedFile.name}" exceeds maximum size of ${maxSizeMB}MB`
      )
    }

    return null
  }
}

/**
 * Правило разрешенных типов файлов
 * @param allowedTypes - Массив разрешенных типов (расширения или MIME типы)
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function fileType(
  allowedTypes: string[],
  msg?: MaybeRefOrGetter<string>
): Rule<FileList | File | File[] | null> {
  return files => {
    if (!files) return null

    const filesToCheck: File[] = []

    if (typeof FileList !== 'undefined' && files instanceof FileList) {
      filesToCheck.push(...Array.from(files))
    } else if (Array.isArray(files)) {
      filesToCheck.push(...files)
    } else if (typeof File !== 'undefined' && files instanceof File) {
      filesToCheck.push(files)
    }

    const invalidFile = filesToCheck.find(file => {
      return !allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        } else if (type.endsWith('/*')) {
          // MIME wildcard: 'image/*' matches 'image/png', 'image/jpeg', etc.
          const prefix = type.slice(0, -1)
          return file.type.startsWith(prefix)
        } else {
          return file.type === type
        }
      })
    })

    if (invalidFile) {
      const allowedTypesStr = allowedTypes.join(', ')
      const message = resolveMessage(msg)
      return (
        message ||
        `File "${invalidFile.name}" has invalid type. Allowed: ${allowedTypesStr}`
      )
    }

    return null
  }
}

/**
 * Правило количества файлов
 * @param min - Минимальное количество файлов
 * @param max - Максимальное количество файлов
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function fileCount(
  min?: number,
  max?: number,
  msg?: MaybeRefOrGetter<string>
): Rule<FileList | File | File[] | null> {
  return files => {
    if (!files) {
      if (min && min > 0) {
        const message = resolveMessage(msg)
        return message || `Minimum files: ${min}`
      }
      return null
    }

    let count = 0

    if (typeof FileList !== 'undefined' && files instanceof FileList) {
      count = files.length
    } else if (Array.isArray(files)) {
      count = files.length
    } else if (typeof File !== 'undefined' && files instanceof File) {
      count = 1
    }

    const message = resolveMessage(msg)
    if (min !== undefined && count < min) {
      return message || `Minimum files: ${min}`
    }

    if (max !== undefined && count > max) {
      return message || `Maximum files: ${max}`
    }

    return null
  }
}
