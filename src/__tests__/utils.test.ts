import { describe, it, expect, vi } from 'vitest'
import { deepEqual, deepClone } from '../utils/deep'
import { debounce } from '../utils/debounce'
import { setNestedValue, getNestedValue, expandWildcardPaths } from '../utils/nested'

describe('deepEqual', () => {
  it('primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, false)).toBe(false)
  })

  it('null / undefined — не взаимозаменяемы', () => {
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
    expect(deepEqual(null, 0)).toBe(false)
  })

  // NaN !== NaN по спеке, deepEqual построен на ===
  it('NaN не равен сам себе', () => {
    expect(deepEqual(NaN, NaN)).toBe(false)
  })

  it('plain objects', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
  })

  it('arrays', () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual([1], [1, 2])).toBe(false)
  })

  it('Date', () => {
    expect(deepEqual(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(true)
    expect(deepEqual(new Date('2024-01-01'), new Date('2025-01-01'))).toBe(false)
  })

  it('File — сравнение по name/size/lastModified', () => {
    const a = new File(['x'], 'f.txt', { lastModified: 1000 })
    const b = new File(['x'], 'f.txt', { lastModified: 1000 })
    const c = new File(['y'], 'other.txt', { lastModified: 2000 })
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  it('разные типы', () => {
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual([], {})).toBe(false)
  })
})

describe('deepClone', () => {
  it('примитивы и null возвращает as-is', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hi')).toBe('hi')
    expect(deepClone(null)).toBe(null)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it('клон массива не мутирует оригинал', () => {
    const src = [1, [2, 3]]
    const copy = deepClone(src) as any[]
    ;(copy[1] as number[])[0] = 99
    expect((src[1] as number[])[0]).toBe(2)
  })

  it('клон объекта не мутирует оригинал', () => {
    const src = { a: { b: 1 } }
    const copy = deepClone(src) as typeof src
    copy.a.b = 99
    expect(src.a.b).toBe(1)
  })

  it('Date клонируется в новый инстанс', () => {
    const d = new Date('2024-06-01')
    const copy = deepClone(d) as Date
    expect(copy.getTime()).toBe(d.getTime())
    expect(copy).not.toBe(d)
  })

  it('File не клонируется — остаётся та же ссылка', () => {
    const f = new File(['data'], 'test.txt')
    expect(deepClone(f)).toBe(f)
  })
})

describe('setNestedValue', () => {
  it('простой путь', () => {
    const obj: any = {}
    setNestedValue(obj, 'name', 'Alice')
    expect(obj.name).toBe('Alice')
  })

  it('создаёт промежуточные объекты', () => {
    const obj: any = {}
    setNestedValue(obj, 'a.b.c', 42)
    expect(obj.a.b.c).toBe(42)
  })

  // Регрессия: числовой индекс должен создавать массив, а не объект
  it('числовой ключ создаёт массив', () => {
    const obj: any = {}
    setNestedValue(obj, 'a.0.name', 'test')
    expect(Array.isArray(obj.a)).toBe(true)
    expect(obj.a[0].name).toBe('test')
  })

  it('no-op для пустого пути или null объекта', () => {
    const obj = { x: 1 }
    setNestedValue(obj, '', 'nope')
    expect(obj).toEqual({ x: 1 })
    setNestedValue(null as any, 'a', 1) // не кидает
  })
})

describe('getNestedValue', () => {
  it('читает по вложенному пути', () => {
    expect(getNestedValue({ a: { b: 42 } }, 'a.b')).toBe(42)
    expect(getNestedValue({ items: ['x', 'y'] }, 'items.1')).toBe('y')
  })

  it('undefined для несуществующих путей', () => {
    expect(getNestedValue({}, 'a.b.c')).toBeUndefined()
    expect(getNestedValue(null, 'a')).toBeUndefined()
    expect(getNestedValue({ a: 1 }, '')).toBeUndefined()
  })
})

describe('expandWildcardPaths', () => {
  const rule = () => null

  it('без wildcard — возвращает как есть', () => {
    const rules = { name: [rule], email: [rule] }
    expect(expandWildcardPaths(rules, {})).toEqual(rules)
  })

  it('раскрывает * по длине массива', () => {
    const result = expandWildcardPaths(
      { 'items.*.name': [rule] },
      { items: [{}, {}, {}] },
    )
    expect(Object.keys(result)).toEqual([
      'items.0.name',
      'items.1.name',
      'items.2.name',
    ])
  })

  it('пустой/отсутствующий массив — ничего не раскрывает', () => {
    expect(Object.keys(expandWildcardPaths({ 'a.*.x': [rule] }, { a: [] }))).toEqual([])
    expect(Object.keys(expandWildcardPaths({ 'a.*.x': [rule] }, {}))).toEqual([])
  })
})

describe('debounce', () => {
  it('вызывает функцию после задержки', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async (x: number) => x * 2)
    const d = debounce(fn, 100)

    const p = d(5)
    vi.advanceTimersByTime(100)

    expect(await p).toBe(10)
    expect(fn).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('новый вызов отменяет предыдущий (AbortError)', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async (x: number) => x)
    const d = debounce(fn, 100)

    const first = d(1)
    const second = d(2)
    vi.advanceTimersByTime(100)

    await expect(first).rejects.toThrow('Debounce superseded')
    expect(await second).toBe(2)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
