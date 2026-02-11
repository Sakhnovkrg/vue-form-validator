import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { createForm } from '../forms/core'
import { required } from '../rules/basic'
import { arrayMinLength, arrayRequired } from '../rules/array'
import type { FormInstance } from '../forms/types'

let _scope: ReturnType<typeof effectScope>
function setup<T extends Record<string, any>>(fn: () => FormInstance<T>) {
  _scope = effectScope()
  return _scope.run(fn)!
}
afterEach(() => _scope?.stop())

describe('addArrayItem / removeArrayItem', () => {
  it('добавляет и удаляет элементы', () => {
    const form = setup(() =>
      createForm({ initialValues: { items: [] as string[] } })
    )

    form.addArrayItem('items', 'a')
    form.addArrayItem('items', 'b')
    expect(form.values.value.items).toEqual(['a', 'b'])

    form.removeArrayItem('items', 0)
    expect(form.values.value.items).toEqual(['b'])
  })

  it('ревалидирует touched массив при добавлении', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { items: [] as string[] } })
      f.setRules({ items: [arrayMinLength(2, 'Мало')] })
      return f
    })

    form.touch('items')
    await form.validateField('items')
    expect(form.hasError('items')).toBe(true)

    form.addArrayItem('items', 'a')
    form.addArrayItem('items', 'b')
    await vi.waitFor(() => expect(form.hasError('items')).toBe(false))
  })
})

describe('toggleArrayItem', () => {
  it('добавляет/убирает элемент и корректно ревалидирует', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { tags: [] as string[] } })
      f.setRules({ tags: [arrayRequired('Выберите хотя бы один')] })
      return f
    })

    await form.toggleArrayItem('tags', 'vue')
    expect(form.values.value.tags).toEqual(['vue'])
    await vi.waitFor(() => expect(form.hasError('tags')).toBe(false))

    await form.toggleArrayItem('tags', 'vue')
    expect(form.values.value.tags).toEqual([])
    await vi.waitFor(() => expect(form.hasError('tags')).toBe(true))
  })

  it('не вызывает правило больше двух раз за toggle', async () => {
    const rule = vi.fn((arr: string[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 'Нужен хотя бы один'
      return null
    })

    const form = setup(() => {
      const f = createForm({ initialValues: { tags: [] as string[] } })
      f.setRules({ tags: [rule] })
      return f
    })

    rule.mockClear()
    await form.toggleArrayItem('tags', 'vue')
    expect(rule.mock.calls.length).toBeLessThanOrEqual(2)
  })
})

describe('arrayIncludes', () => {
  it('проверяет наличие элемента', () => {
    const form = setup(() =>
      createForm({ initialValues: { tags: ['vue', 'react'] as string[] } })
    )
    expect(form.arrayIncludes('tags', 'vue')).toBe(true)
    expect(form.arrayIncludes('tags', 'angular')).toBe(false)
  })
})

describe('arrayPath / objectPath', () => {
  it('генерирует строковые пути', () => {
    const form = setup(() =>
      createForm({
        initialValues: {
          contacts: [{ name: '', email: '' }],
          address: { street: '', city: '' },
        },
      })
    )

    expect(form.arrayPath('contacts', 0, 'name')).toBe('contacts.0.name')
    expect(form.arrayPath('contacts', 2, 'email')).toBe('contacts.2.email')
    expect(form.objectPath('address', 'street')).toBe('address.street')
  })
})

describe('wildcard-правила', () => {
  it('раскрывает * в конкретные индексы при validateForm', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: '', email: '' }] },
      })
      f.setRules({
        'contacts.*.name': [required('Имя')],
        'contacts.*.email': [required('Email')],
      } as any)
      return f
    })

    expect(await form.validateForm()).toBe(false)
    expect(form.error('contacts.0.name' as any)).toBe('Имя')
    expect(form.error('contacts.0.email' as any)).toBe('Email')
  })

  it('validateField для конкретного nested-пути', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: 'Alice', email: '' }] },
      })
      f.setRules({ 'contacts.*.email': [required('Email обязателен')] } as any)
      return f
    })

    expect(await form.validateField('contacts.0.email' as any)).toEqual([
      'Email обязателен',
    ])
    expect(await form.validateField('contacts.0.name' as any)).toEqual([])
  })

  it('addArrayItem → wildcard раскрывается на новый элемент', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: 'Alice' }] },
      })
      f.setRules({ 'contacts.*.name': [required('Имя')] } as any)
      return f
    })

    form.addArrayItem('contacts', { name: '' })
    expect(await form.validateForm()).toBe(false)
    expect(form.hasError('contacts.0.name' as any)).toBe(false)
    expect(form.error('contacts.1.name' as any)).toBe('Имя')
  })

  it('removeArrayItem → stale nested-ошибки очищаются', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: '' }, { name: '' }] },
      })
      f.setRules({ 'contacts.*.name': [required('Имя')] } as any)
      return f
    })

    await form.validateForm()
    expect(form.hasError('contacts.0.name' as any)).toBe(true)
    expect(form.hasError('contacts.1.name' as any)).toBe(true)

    form.removeArrayItem('contacts', 0)
    expect(await form.validateForm()).toBe(false)
    expect(form.hasError('contacts.0.name' as any)).toBe(true)
    expect(form.hasError('contacts.1.name' as any)).toBe(false)
  })
})

describe('nested touch / clear / reset', () => {
  it('touch помечает конкретное вложенное поле', () => {
    const form = setup(() =>
      createForm({ initialValues: { contacts: [{ name: '' }] } })
    )
    form.touch('contacts.0.name' as any)
    expect(form.isTouched('contacts.0.name' as any)).toBe(true)
  })

  it('clear убирает nested errors и touched', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { contacts: [{ name: '' }] } })
      f.setRules({ 'contacts.*.name': [required('Имя')] } as any)
      return f
    })

    await form.validateForm()
    expect(form.hasError('contacts.0.name' as any)).toBe(true)

    form.clear()
    expect(form.hasError('contacts.0.name' as any)).toBe(false)
    expect(form.isTouched('contacts.0.name' as any)).toBe(false)
  })

  it('reset убирает nested errors и touched', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { contacts: [{ name: '' }] } })
      f.setRules({ 'contacts.*.name': [required('Имя')] } as any)
      return f
    })

    await form.validateForm()
    expect(form.hasError('contacts.0.name' as any)).toBe(true)

    form.reset()
    expect(form.hasError('contacts.0.name' as any)).toBe(false)
    expect(form.isTouched('contacts.0.name' as any)).toBe(false)
  })
})
