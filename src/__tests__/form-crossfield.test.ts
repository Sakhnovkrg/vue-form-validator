import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { createForm } from '../forms/core'
import { required, minLength } from '../rules/basic'
import { sameAs, requiredIf, dateAfter } from '../rules/advanced'
import type { FormInstance } from '../forms/types'

let _scope: ReturnType<typeof effectScope>
function setup<T extends Record<string, any>>(fn: () => FormInstance<T>) {
  _scope = effectScope()
  return _scope.run(fn)!
}
afterEach(() => _scope?.stop())

describe('sameAs', () => {
  it('смена password автоматически ревалидирует confirm через watcher', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { password: '', confirm: '' } })
      f.setRules({
        password: [required(), minLength(3)],
        confirm: [sameAs('password', 'Не совпадает')],
      })
      return f
    })

    form.val.password = 'abc'
    form.val.confirm = 'abc'
    form.touch('password')
    form.touch('confirm')
    await form.validateForm()
    expect(form.hasError('confirm')).toBe(false)

    form.val.password = 'xyz'
    await vi.waitFor(() => expect(form.error('confirm')).toBe('Не совпадает'))
  })

  it('validateForm видит рассинхрон без ручного clearCache', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { password: '', confirm: '' } })
      f.setRules({
        password: [required(), minLength(3)],
        confirm: [sameAs('password', 'Не совпадает')],
      })
      return f
    })

    form.val.password = 'abc'
    form.val.confirm = 'abc'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)

    form.val.password = 'xyz'
    await form.validateForm()
    expect(form.error('confirm')).toBe('Не совпадает')

    form.val.confirm = 'xyz'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)
  })
})

describe('requiredIf', () => {
  it('переключение условия меняет обязательность поля', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { type: 'personal', company: '' } })
      f.setRules({ company: [requiredIf('type', 'business', 'Укажите')] })
      return f
    })

    await form.validateForm()
    expect(form.hasError('company')).toBe(false)

    form.val.type = 'business'
    await form.validateForm()
    expect(form.error('company')).toBe('Укажите')

    form.val.type = 'personal'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)
  })
})

describe('dateAfter', () => {
  it('смена startDate инвалидирует кэш endDate', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { startDate: '', endDate: '' } })
      f.setRules({
        endDate: [dateAfter('startDate', 'Конец раньше начала')],
      })
      return f
    })

    form.val.startDate = '2025-01-01'
    form.val.endDate = '2025-06-01'
    await form.validateForm()
    expect(form.hasError('endDate')).toBe(false)

    form.val.startDate = '2025-12-01'
    await form.validateForm()
    expect(form.error('endDate')).toBe('Конец раньше начала')
  })
})

describe('sameAs внутри wildcard-правил', () => {
  it('confirmEmail проверяется против email в том же элементе массива', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: {
          contacts: [
            { email: '', confirmEmail: '' },
            { email: '', confirmEmail: '' },
          ],
        },
      })
      f.setRules({
        'contacts.*.email': [required('Email обязателен')],
        'contacts.*.confirmEmail': [sameAs('contacts.*.email', 'Не совпадает')],
      } as any)
      return f
    })

    form.val.contacts[0].email = 'a@b.com'
    form.val.contacts[0].confirmEmail = 'a@b.com'
    form.val.contacts[1].email = 'x@y.com'
    form.val.contacts[1].confirmEmail = 'x@y.com'
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)
    expect(form.hasError('contacts.1.confirmEmail' as any)).toBe(false)

    form.val.contacts[1].confirmEmail = 'wrong'
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)
    expect(form.error('contacts.1.confirmEmail' as any)).toBe('Не совпадает')
  })

  it('watcher: смена email автоматически ревалидирует confirmEmail', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ email: '', confirmEmail: '' }] },
      })
      f.setRules({
        'contacts.*.email': [required('Email обязателен')],
        'contacts.*.confirmEmail': [sameAs('contacts.*.email', 'Не совпадает')],
      } as any)
      return f
    })

    form.val.contacts[0].email = 'a@b.com'
    form.val.contacts[0].confirmEmail = 'a@b.com'
    form.touch('contacts.0.email' as any)
    form.touch('contacts.0.confirmEmail' as any)
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)

    form.val.contacts[0].email = 'new@b.com'
    await vi.waitFor(() =>
      expect(form.error('contacts.0.confirmEmail' as any)).toBe('Не совпадает')
    )
  })

  it('смена email инвалидирует кэш confirmEmail без clearCache', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ email: '', confirmEmail: '' }] },
      })
      f.setRules({
        'contacts.*.confirmEmail': [sameAs('contacts.*.email', 'Не совпадает')],
      } as any)
      return f
    })

    form.val.contacts[0].email = 'a@b.com'
    form.val.contacts[0].confirmEmail = 'a@b.com'
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)

    form.val.contacts[0].email = 'new@b.com'
    await form.validateForm()
    expect(form.error('contacts.0.confirmEmail' as any)).toBe('Не совпадает')
  })
})
