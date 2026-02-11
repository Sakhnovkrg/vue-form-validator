import { describe, it, expect, vi } from 'vitest'
import {
  required,
  minLength,
  maxLength,
  email,
  regex,
  numeric,
  between,
  oneOf,
  minValue,
  maxValue,
} from '../rules/basic'
import { fileRequired, fileSize, fileType, fileCount } from '../rules/file'
import { arrayMinLength, arrayRequired, arrayMaxLength } from '../rules/array'
import {
  custom,
  sameAs,
  requiredIf,
  dateAfter,
  remote,
} from '../rules/advanced'

describe('required', () => {
  const rule = required()

  it('null / undefined / пустая строка / [] → ошибка', () => {
    for (const v of [null, undefined, '', []]) {
      expect(rule(v)).toBeTruthy()
    }
  })

  it('непустые значения проходят (включая 0 и false)', () => {
    for (const v of ['hello', 0, false, [1]]) {
      expect(rule(v)).toBeNull()
    }
  })

  it('кастомное сообщение', () => {
    expect(required('Обязательно')('')).toBe('Обязательно')
  })
})

describe('minLength', () => {
  it('короче минимума → ошибка, длиннее/равно → ок', () => {
    const rule = minLength(3)
    expect(rule('ab')).toBeTruthy()
    expect(rule('abc')).toBeNull()
    expect(rule('abcd')).toBeNull()
  })

  it('пустая строка пропускается (для required есть отдельное правило)', () => {
    expect(minLength(3)('')).toBeNull()
  })

  it('throws на отрицательную длину', () => {
    expect(() => minLength(-1)).toThrow()
  })
})

describe('maxLength', () => {
  it('длиннее макса → ошибка', () => {
    const rule = maxLength(5)
    expect(rule('123456')).toBeTruthy()
    expect(rule('12345')).toBeNull()
    expect(rule('')).toBeNull()
  })
})

describe('email', () => {
  const rule = email()

  it('валидные адреса', () => {
    expect(rule('test@example.com')).toBeNull()
    expect(rule('a@b.c')).toBeNull()
  })

  it('невалидные адреса', () => {
    expect(rule('not-email')).toBeTruthy()
    expect(rule('@b.com')).toBeTruthy()
  })

  it('пустая строка пропускается', () => {
    expect(rule('')).toBeNull()
  })
})

describe('regex', () => {
  it('проверяет по паттерну', () => {
    const rule = regex(/^\d+$/)
    expect(rule('123')).toBeNull()
    expect(rule('abc')).toBeTruthy()
  })

  it('глобальный флаг не ломает повторные вызовы (lastIndex)', () => {
    const rule = regex(/\d+/g)
    // с флагом g без фикса второй вызов мог бы сфейлить
    expect(rule('1')).toBeNull()
    expect(rule('1')).toBeNull()
  })
})

describe('numeric', () => {
  const rule = numeric()

  it('числа и числовые строки', () => {
    for (const v of ['123', '-5', '3.14', 42]) {
      expect(rule(v)).toBeNull()
    }
  })

  it('буквы → ошибка', () => {
    expect(rule('abc')).toBeTruthy()
    expect(rule('12abc')).toBeTruthy()
  })

  it('пустые значения пропускаются', () => {
    expect(rule(null as any)).toBeNull()
    expect(rule('')).toBeNull()
  })
})

describe('between', () => {
  const rule = between(1, 10)

  it('в диапазоне → ок, за пределами → ошибка', () => {
    expect(rule(1)).toBeNull()
    expect(rule(5)).toBeNull()
    expect(rule(10)).toBeNull()
    expect(rule(0)).toBeTruthy()
    expect(rule(11)).toBeTruthy()
  })

  it('throws если min > max', () => {
    expect(() => between(10, 1)).toThrow()
  })
})

describe('oneOf', () => {
  it('значение из списка → ок, иначе → ошибка', () => {
    const rule = oneOf(['a', 'b', 'c'])
    expect(rule('a')).toBeNull()
    expect(rule('d')).toBeTruthy()
    expect(rule('')).toBeNull() // пустое пропускается
  })

  it('throws на пустой массив', () => {
    expect(() => oneOf([])).toThrow()
  })
})

describe('minValue / maxValue', () => {
  it('minValue', () => {
    const rule = minValue(5)
    expect(rule(5)).toBeNull()
    expect(rule(4)).toBeTruthy()
  })

  it('maxValue', () => {
    const rule = maxValue(100)
    expect(rule(100)).toBeNull()
    expect(rule(101)).toBeTruthy()
  })
})

describe('fileRequired', () => {
  const rule = fileRequired()

  it('null → ошибка, File → ок', () => {
    expect(rule(null)).toBeTruthy()
    expect(rule(new File(['x'], 'a.txt'))).toBeNull()
  })

  it('пустой массив → ошибка, непустой → ок', () => {
    expect(rule([])).toBeTruthy()
    expect(rule([new File(['x'], 'a.txt')])).toBeNull()
  })
})

describe('fileSize', () => {
  it('файл в пределах лимита проходит', () => {
    const rule = fileSize(1024)
    expect(rule(new File(['x'], 'small.txt'))).toBeNull()
  })

  it('файл больше лимита → ошибка', () => {
    const rule = fileSize(5)
    expect(rule(new File(['0123456789'], 'big.txt'))).toBeTruthy()
  })

  it('throws на <= 0', () => {
    expect(() => fileSize(0)).toThrow()
  })
})

describe('fileType', () => {
  it('по расширению', () => {
    const rule = fileType(['.txt', '.md'])
    expect(
      rule(new File([''], 'readme.txt', { type: 'text/plain' }))
    ).toBeNull()
    expect(rule(new File([''], 'pic.png', { type: 'image/png' }))).toBeTruthy()
  })

  it('по MIME-типу', () => {
    const rule = fileType(['image/png'])
    expect(rule(new File([''], 'a.png', { type: 'image/png' }))).toBeNull()
    expect(
      rule(new File([''], 'a.pdf', { type: 'application/pdf' }))
    ).toBeTruthy()
  })

  it('MIME wildcard (image/*)', () => {
    const rule = fileType(['image/*'])
    expect(rule(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(
      rule(new File([''], 'a.pdf', { type: 'application/pdf' }))
    ).toBeTruthy()
  })
})

describe('fileSize', () => {
  it('null пропускается', () => {
    expect(fileSize(1024)(null)).toBeNull()
  })

  it('массив файлов — проверяет каждый', () => {
    const rule = fileSize(5)
    const small = new File(['x'], 'ok.txt')
    const big = new File(['0123456789'], 'big.txt')
    expect(rule([small])).toBeNull()
    expect(rule([small, big])).toBeTruthy()
  })

  it('одиночный File', () => {
    expect(fileSize(1024)(new File(['x'], 'a.txt'))).toBeNull()
  })
})

describe('fileType', () => {
  it('одиночный File (не массив)', () => {
    const rule = fileType(['.txt'])
    expect(rule(new File([''], 'a.txt', { type: 'text/plain' }))).toBeNull()
    expect(rule(new File([''], 'a.png', { type: 'image/png' }))).toBeTruthy()
  })

  it('null пропускается', () => {
    expect(fileType(['.txt'])(null)).toBeNull()
  })
})

describe('fileCount', () => {
  const file = () => new File(['x'], 'f.txt')

  it('min', () => {
    expect(fileCount(2)([file()])).toBeTruthy()
    expect(fileCount(2)([file(), file()])).toBeNull()
  })

  it('max', () => {
    expect(fileCount(undefined, 1)([file(), file()])).toBeTruthy()
    expect(fileCount(undefined, 1)([file()])).toBeNull()
  })

  it('null с min > 0 → ошибка', () => {
    expect(fileCount(1)(null)).toBeTruthy()
  })

  it('null без min → ок', () => {
    expect(fileCount(undefined, 5)(null)).toBeNull()
  })

  it('одиночный File считается как 1', () => {
    expect(fileCount(1)(file())).toBeNull()
    expect(fileCount(2)(file())).toBeTruthy()
  })
})

describe('arrayMinLength / arrayMaxLength / arrayRequired', () => {
  it('arrayMinLength', () => {
    const rule = arrayMinLength(2)
    expect(rule([1])).toBeTruthy()
    expect(rule([1, 2])).toBeNull()
  })

  it('arrayMaxLength', () => {
    const rule = arrayMaxLength(3)
    expect(rule([1, 2, 3])).toBeNull()
    expect(rule([1, 2, 3, 4])).toBeTruthy()
  })

  it('arrayRequired', () => {
    expect(arrayRequired()([])).toBeTruthy()
    expect(arrayRequired()([1])).toBeNull()
    expect(arrayRequired()(null as any)).toBeTruthy()
  })
})

describe('custom', () => {
  it('синхронный boolean — возвращает string|null, НЕ промис', () => {
    const rule = custom(v => v === 'ok')
    const pass = rule('ok', {})
    const fail = rule('nope', {})

    expect(pass).toBeNull()
    expect(fail).toBe('Validation failed')
    expect(pass instanceof Promise).toBe(false)
    expect(fail instanceof Promise).toBe(false)
  })

  it('синхронный — может вернуть свою строку ошибки', () => {
    const rule = custom(v => (v === 'ok' ? true : 'Wrong!'))
    expect(rule('ok', {})).toBeNull()
    expect(rule('bad', {})).toBe('Wrong!')
  })

  it('async — возвращает промис', async () => {
    const rule = custom(async v => v === 'ok')
    expect(await rule('ok', {})).toBeNull()
    expect(await rule('bad', {})).toBe('Validation failed')
  })
})

describe('sameAs', () => {
  const rule = sameAs('password', 'Пароли не совпадают')

  it('совпадают → ок', () => {
    expect(rule('abc', { password: 'abc' })).toBeNull()
  })

  it('не совпадают → ошибка', () => {
    expect(rule('abc', { password: 'xyz' })).toBe('Пароли не совпадают')
  })

  it('оба пустые → ок', () => {
    expect(rule('', { password: '' })).toBeNull()
    expect(rule(null, { password: null })).toBeNull()
  })

  it('прокидывает __crossField метаданные', () => {
    expect((rule as any).__crossField).toEqual({ dependsOn: ['password'] })
  })
})

describe('requiredIf', () => {
  const rule = requiredIf('type', 'business', 'Укажите компанию')

  it('условие выполнено — поле обязательно', () => {
    expect(rule('', { type: 'business' })).toBe('Укажите компанию')
    expect(rule('Acme', { type: 'business' })).toBeNull()
  })

  it('условие не выполнено — поле необязательно', () => {
    expect(rule('', { type: 'personal' })).toBeNull()
  })

  it('метаданные __crossField и __requiredIf', () => {
    expect((rule as any).__crossField.dependsOn).toEqual(['type'])
    expect((rule as any).__requiredIf).toEqual({
      conditionField: 'type',
      conditionValue: 'business',
    })
  })
})

describe('dateAfter', () => {
  const rule = dateAfter('startDate')

  it('конец после начала → ок', () => {
    expect(rule('2025-06-01', { startDate: '2025-01-01' })).toBeNull()
  })

  it('конец до начала → ошибка', () => {
    expect(rule('2025-01-01', { startDate: '2025-06-01' })).toBeTruthy()
  })

  it('одна из дат пустая → пропуск', () => {
    expect(rule('', { startDate: '2025-01-01' })).toBeNull()
    expect(rule('2025-01-01', { startDate: '' })).toBeNull()
  })
})

describe('remote', () => {
  it('проходит через debounce и возвращает результат', async () => {
    vi.useFakeTimers()
    const check = vi.fn(async (v: string) => v === 'free')
    const rule = remote(check, 'Занято', 50)

    const p = rule('free', {}) as Promise<any>
    vi.advanceTimersByTime(50)
    expect(await p).toBeNull()

    const p2 = rule('taken', {}) as Promise<any>
    vi.advanceTimersByTime(50)
    expect(await p2).toBe('Занято')
    vi.useRealTimers()
  })

  it('пустые значения не триггерят проверку', async () => {
    const check = vi.fn(async () => false)
    const rule = remote(check, 'err', 0)

    expect(await rule('', {})).toBeNull()
    expect(await rule(null, {})).toBeNull()
    expect(check).not.toHaveBeenCalled()
  })
})
