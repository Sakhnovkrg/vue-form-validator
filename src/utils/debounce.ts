/**
 * Создает дебаунсированную версию асинхронной функции
 * @template T - Тип функции
 * @param fn - Асинхронная функция для дебаунса
 * @param delay - Задержка дебаунса в миллисекундах
 * @returns Дебаунсированная функция, возвращающая промис
 */
export function debounce<T extends (..._args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (..._args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingReject: ((_reason: any) => void) | null = null

  return (..._args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    // Reject предыдущий висящий Promise, чтобы он не оставался pending навсегда
    if (pendingReject) {
      pendingReject(new DOMException('Debounce superseded', 'AbortError'))
      pendingReject = null
    }
    if (timeoutId) clearTimeout(timeoutId)

    return new Promise((resolve, reject) => {
      pendingReject = reject

      timeoutId = setTimeout(async () => {
        pendingReject = null
        try {
          const result = await fn(..._args)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          timeoutId = null
        }
      }, delay)
    })
  }
}
