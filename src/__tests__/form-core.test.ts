import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createForm } from '../forms/core'
import { required, email } from '../rules/basic'
import { requiredIf } from '../rules/advanced'
import type { FormInstance } from '../forms/types'

let _scope: ReturnType<typeof effectScope>
function setup<T extends Record<string, any>>(fn: () => FormInstance<T>) {
  _scope = effectScope()
  return _scope.run(fn)!
}
afterEach(() => _scope?.stop())

describe('createForm', () => {
  it('инициализируется с начальными значениями и чистым состоянием', () => {
    const form = setup(() =>
      createForm({ initialValues: { name: '', age: 0 } })
    )

    expect(form.values.value).toEqual({ name: '', age: 0 })
    expect(form.isValid.value).toBe(true)
    expect(form.isDirty.value).toBe(false)
    expect(form.hasAnyErrors.value).toBe(false)
  })
})

describe('validateField', () => {
  it('проставляет ошибку и очищает при исправлении', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required('Обязательно')] })
      return f
    })

    expect(await form.validateField('name')).toEqual(['Обязательно'])
    expect(form.error('name')).toBe('Обязательно')

    form.val.name = 'Alice'
    expect(await form.validateField('name')).toEqual([])
    expect(form.hasError('name')).toBe(false)
  })
})

describe('validateForm', () => {
  it('false когда есть ошибки, true когда всё валидно', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '', email: '' } })
      f.setRules({ name: [required()], email: [required(), email()] })
      return f
    })

    expect(await form.validateForm()).toBe(false)

    form.val.name = 'Alice'
    form.val.email = 'a@b.com'
    expect(await form.validateForm()).toBe(true)
  })

  it('помечает все поля как touched', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { a: '', b: '' } })
      f.setRules({ a: [required()], b: [required()] })
      return f
    })

    expect(form.isTouched('a')).toBe(false)
    await form.validateForm()
    expect(form.isTouched('a')).toBe(true)
    expect(form.isTouched('b')).toBe(true)
  })
})

describe('touch', () => {
  it('помечает поле и запускает валидацию', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required()] })
      return f
    })

    expect(form.isTouched('name')).toBe(false)
    form.touch('name')
    expect(form.isTouched('name')).toBe(true)
    await vi.waitFor(() => expect(form.hasError('name')).toBe(true))
  })
})

describe('submit', () => {
  it('вызывает onSubmit только когда форма валидна', async () => {
    const onSubmit = vi.fn()
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' }, onSubmit })
      f.setRules({ name: [required()] })
      return f
    })

    await form.submit()
    expect(onSubmit).not.toHaveBeenCalled()

    form.val.name = 'Alice'
    await form.submit()
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' })
  })

  it('isSubmitting=true во время onSubmit', async () => {
    let submittingDuringCallback = false
    const form = setup(() =>
      createForm({
        initialValues: { name: 'ok' },
        onSubmit: async () => {
          submittingDuringCallback = form.isSubmitting.value
          await new Promise(r => setTimeout(r, 10))
        },
      })
    )

    expect(form.isSubmitting.value).toBe(false)
    await form.submit()
    expect(submittingDuringCallback).toBe(true)
    expect(form.isSubmitting.value).toBe(false)
  })
})

describe('setValues / getValues', () => {
  it('обновляет и возвращает глубокую копию', () => {
    const form = setup(() =>
      createForm({ initialValues: { name: '', age: 0 } })
    )

    form.setValues({ name: 'Bob', age: 30 })
    expect(form.values.value.name).toBe('Bob')
    expect(form.getValues()).toEqual({ name: 'Bob', age: 30 })
  })

  it('getValues возвращает deep copy', () => {
    const form = setup(() =>
      createForm({ initialValues: { tags: ['a', 'b'] } })
    )

    const copy = form.getValues()
    copy.tags.push('c')
    expect(form.values.value.tags).toEqual(['a', 'b'])
  })
})

describe('setErrors', () => {
  it('ставит ошибки вручную и помечает поле как touched', () => {
    const form = setup(() => createForm({ initialValues: { name: '' } }))

    form.setErrors({ name: ['Серверная ошибка'] })
    expect(form.error('name')).toBe('Серверная ошибка')
    expect(form.allErrors('name')).toEqual(['Серверная ошибка'])
    expect(form.isTouched('name')).toBe(true)
  })
})

describe('resetErrors', () => {
  it('очищает ошибки и touched', () => {
    const form = setup(() => createForm({ initialValues: { name: '' } }))

    form.setErrors({ name: ['err'] })
    form.resetErrors()
    expect(form.hasError('name')).toBe(false)
    expect(form.isTouched('name')).toBe(false)
  })
})

describe('clear', () => {
  it('сбрасывает значения к "пустым" по типу', () => {
    const form = setup(() =>
      createForm({ initialValues: { name: 'Alice', count: 5, tags: ['a'] } })
    )

    form.val.name = 'Bob'
    form.touch('name')
    form.clear()

    expect(form.values.value).toEqual({ name: '', count: 0, tags: [] })
    expect(form.isTouched('name')).toBe(false)
  })

  it('useInitial=true → сброс к начальным', () => {
    const form = setup(() => createForm({ initialValues: { name: 'Alice' } }))
    form.val.name = 'Bob'
    form.clear(true)
    expect(form.values.value.name).toBe('Alice')
  })

  it('вызывает onClear колбэк', () => {
    const onClear = vi.fn()
    const form = setup(() => createForm({ initialValues: { x: '' }, onClear }))
    form.clear()
    expect(onClear).toHaveBeenCalledOnce()
  })
})

describe('reset', () => {
  it('возвращает к начальным значениям', () => {
    const form = setup(() => createForm({ initialValues: { name: 'Alice' } }))
    form.val.name = 'Bob'
    form.touch('name')
    form.reset()
    expect(form.values.value.name).toBe('Alice')
    expect(form.isTouched('name')).toBe(false)
  })

  it('с новыми значениями — обновляет и начальные', () => {
    const form = setup(() => createForm({ initialValues: { name: 'Alice' } }))

    form.reset({ name: 'Charlie' })
    expect(form.values.value.name).toBe('Charlie')

    form.val.name = 'Dave'
    form.reset()
    expect(form.values.value.name).toBe('Charlie')
  })
})

describe('resetState', () => {
  it('чистит errors/touched/dirty, но не меняет значения', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required()] })
      return f
    })

    form.touch('name')
    await form.validateField('name')
    form.resetState()

    expect(form.hasError('name')).toBe(false)
    expect(form.isTouched('name')).toBe(false)
    expect(form.values.value.name).toBe('')
  })
})

describe('isValid', () => {
  it('реагирует на изменения ошибок', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required()] })
      return f
    })

    await form.validateForm()
    expect(form.isValid.value).toBe(false)

    form.val.name = 'ok'
    await form.validateField('name')
    expect(form.isValid.value).toBe(true)
  })
})

describe('hasAnyErrors + requiredIf', () => {
  it('неактивные requiredIf-поля не влияют на hasAnyErrors/isValid', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { type: 'personal', company: '' } })
      f.setRules({ company: [requiredIf('type', 'business', 'Укажите')] })
      return f
    })

    await form.validateForm()
    expect(form.hasAnyErrors.value).toBe(false)
    expect(form.isValid.value).toBe(true)

    form.val.type = 'business'
    await form.validateForm()
    expect(form.hasAnyErrors.value).toBe(true)

    form.val.company = 'Acme'
    await form.validateForm()
    expect(form.hasAnyErrors.value).toBe(false)
  })
})

describe('isDirty / dirtyFields / isFieldDirty', () => {
  it('отслеживает изменения относительно начальных значений', async () => {
    const form = setup(() =>
      createForm({ initialValues: { name: 'Alice', age: 25 } })
    )

    expect(form.isDirty.value).toBe(false)
    expect(form.dirtyFields.value).toEqual([])

    form.val.name = 'Bob'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(true)
    expect(form.isDirty.value).toBe(true)
    expect(form.dirtyFields.value).toContain('name')
    expect(form.isFieldDirty('age')).toBe(false)

    form.val.name = 'Alice'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(false)
    expect(form.isDirty.value).toBe(false)
  })
})

describe('touchedFields', () => {
  it('перечисляет только touched поля', () => {
    const form = setup(() =>
      createForm({ initialValues: { name: '', email: '' } })
    )
    form.touch('name')
    expect(form.touchedFields.value).toContain('name')
    expect(form.touchedFields.value).not.toContain('email')
  })
})

describe('getFieldStatus', () => {
  it('собирает полную инфу по полю', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required('!')] })
      return f
    })

    form.touch('name')
    await form.validateField('name')

    const s = form.getFieldStatus('name')
    expect(s).toMatchObject({
      touched: true,
      hasError: true,
      error: '!',
      errors: ['!'],
      value: '',
    })
  })
})

describe('watcher auto-revalidation', () => {
  it('изменение touched поля автоматически ревалидирует', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [required('Обязательно')] })
      return f
    })

    form.touch('name')
    await form.validateField('name')
    expect(form.hasError('name')).toBe(true)

    form.val.name = 'Alice'
    await vi.waitFor(() => expect(form.hasError('name')).toBe(false))

    form.val.name = ''
    await vi.waitFor(() => expect(form.hasError('name')).toBe(true))
  })

  it('не ревалидирует untouched поля', async () => {
    const rule = vi.fn(() => 'err')
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [rule] })
      return f
    })

    rule.mockClear()
    form.val.name = 'test'
    await nextTick()
    await nextTick()
    expect(rule).not.toHaveBeenCalled()
  })
})

describe('clearCache', () => {
  it('сброс кэша заставляет ревалидировать заново', async () => {
    const rule = vi.fn((v: string) => (v === '' ? 'err' : null))
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [rule] })
      return f
    })

    await form.validateField('name')
    const callsAfterFirst = rule.mock.calls.length

    await form.validateField('name')
    expect(rule.mock.calls.length).toBe(callsAfterFirst)

    form.clearCache('name')
    await form.validateField('name')
    expect(rule.mock.calls.length).toBe(callsAfterFirst + 1)
  })
})

describe('dispose', () => {
  it('после dispose watchers перестают ревалидировать', async () => {
    const rule = vi.fn((v: string) => (v === '' ? 'err' : null))
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [rule] })
      return f
    })

    form.touch('name')
    await form.validateField('name')
    expect(form.hasError('name')).toBe(true)

    const callsBefore = rule.mock.calls.length
    form.dispose()

    form.val.name = 'Alice'
    await nextTick()
    await nextTick()
    expect(rule.mock.calls.length).toBe(callsBefore)
  })
})
