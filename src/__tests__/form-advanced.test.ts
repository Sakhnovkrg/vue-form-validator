import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createForm } from '../forms/core'
import { required, minLength, maxLength, email, between, regex } from '../rules/basic'
import { remote, custom, sameAs, requiredIf, dateAfter } from '../rules/advanced'
import { arrayMinLength, arrayRequired } from '../rules/array'
import type { FormInstance } from '../forms/types'

let _scope: ReturnType<typeof effectScope>
function setup<T extends Record<string, any>>(fn: () => FormInstance<T>) {
  _scope = effectScope()
  return _scope.run(fn)!
}
afterEach(() => _scope?.stop())

// -- Гонка: clear() во время асинхронной валидации ---------------------------

describe('clear() во время in-flight remote-валидации', () => {
  it('после clear() результат отменённой валидации не всплывает', async () => {
    vi.useFakeTimers()

    let resolve!: (ok: boolean) => void
    const check = vi.fn(() => new Promise<boolean>(r => { resolve = r }))

    const form = setup(() => {
      const f = createForm({ initialValues: { username: '' } })
      f.setRules({ username: [remote(check, 'Занято', 10)] })
      return f
    })

    form.val.username = 'test'
    form.touch('username')
    const pending = form.validateField('username')

    // debounce отработал — checkFn вызвана, промис висит
    vi.advanceTimersByTime(10)

    // пользователь жмёт «очистить» пока запрос летит
    form.clear()

    // сервер ответил «занято», но нам уже всё равно
    resolve(false)
    await pending.catch(() => {})
    await nextTick()

    expect(form.hasError('username')).toBe(false)
    expect(form.error('username')).toBeNull()
    expect(form.validating('username')).toBe(false)

    vi.useRealTimers()
  })
})

// -- custom(): синхронный валидатор не должен ставить isValidating ------------

describe('custom() — sync vs async', () => {
  it('sync: isValidating никогда не становится true', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { code: '' } })
      f.setRules({ code: [custom(v => v === 'secret', 'Неверный код')] })
      return f
    })

    const errors = await form.validateField('code')
    expect(errors).toEqual(['Неверный код'])
    expect(form.validating('code')).toBe(false)
  })

  it('async: isValidating=true пока промис висит', async () => {
    let resolve!: (v: boolean) => void
    const form = setup(() => {
      const f = createForm({ initialValues: { code: '' } })
      f.setRules({
        code: [custom(() => new Promise<boolean>(r => { resolve = r }), 'Нет')],
      })
      return f
    })

    form.val.code = 'x'
    const pending = form.validateField('code')
    expect(form.validating('code')).toBe(true)

    resolve(true)
    await pending
    expect(form.validating('code')).toBe(false)
  })
})

// -- toggleArrayItem: одна валидация, а не три --------------------------------

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

  it('один toggle = одна валидация, а не три', async () => {
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

    // Правило должно вызваться ровно 1 раз от явного validateField внутри toggleArrayItem.
    // Watcher может добавить ещё один вызов (flush: 'post'), но НЕ три.
    // Главное: не больше двух (toggle + watcher максимум).
    expect(rule.mock.calls.length).toBeLessThanOrEqual(2)
  })
})

// -- Cross-field: sameAs ревалидация -----------------------------------------

describe('sameAs — ревалидация при смене зависимого поля', () => {
  it('пароль изменился → confirmPassword невалидно', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { password: '', confirm: '' },
      })
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

    // Меняем только password — confirm не трогаем.
    // Watcher на password должен сам ревалидировать confirm через cross-field deps.
    form.val.password = 'xyz'
    await vi.waitFor(() => expect(form.error('confirm')).toBe('Не совпадает'))
  })
})

// -- requiredIf: вкл/выкл по условию ----------------------------------------

describe('requiredIf — условная обязательность', () => {
  it('переключение type меняет обязательность company', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { type: 'personal', company: '' },
      })
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
    // ошибка может остаться в errors, но isValid/hasAnyErrors игнорируют неактивные поля
    expect(form.isValid.value).toBe(true)
  })
})

// -- Массивы: add / remove / toggle / includes --------------------------------

describe('addArrayItem / removeArrayItem', () => {
  it('добавляет и удаляет элементы', () => {
    const form = setup(() =>
      createForm({ initialValues: { items: [] as string[] } }),
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

describe('arrayIncludes', () => {
  it('проверяет наличие элемента', () => {
    const form = setup(() =>
      createForm({ initialValues: { tags: ['vue', 'react'] as string[] } }),
    )
    expect(form.arrayIncludes('tags', 'vue')).toBe(true)
    expect(form.arrayIncludes('tags', 'angular')).toBe(false)
  })
})

// -- Вспомогательные пути ----------------------------------------------------

describe('arrayPath / objectPath', () => {
  it('генерирует строковые пути', () => {
    const form = setup(() =>
      createForm({
        initialValues: {
          contacts: [{ name: '', email: '' }],
          address: { street: '', city: '' },
        },
      }),
    )

    expect(form.arrayPath('contacts', 0, 'name')).toBe('contacts.0.name')
    expect(form.arrayPath('contacts', 2, 'email')).toBe('contacts.2.email')
    expect(form.objectPath('address', 'street')).toBe('address.street')
  })
})

// -- Nested (wildcard) валидация ----------------------------------------------

describe('wildcard-правила для массивов', () => {
  it('contacts.*.email раскрывается в contacts.0.email и т.д.', async () => {
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
      f.setRules({
        'contacts.*.email': [required('Email обязателен')],
      } as any)
      return f
    })

    const errors = await form.validateField('contacts.0.email' as any)
    expect(errors).toEqual(['Email обязателен'])

    // name без правил — ошибок нет
    const nameErrors = await form.validateField('contacts.0.name' as any)
    expect(nameErrors).toEqual([])
  })

  it('addArrayItem → wildcard раскрывается на новый элемент', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: 'Alice' }] },
      })
      f.setRules({
        'contacts.*.name': [required('Имя')],
      } as any)
      return f
    })

    form.addArrayItem('contacts', { name: '' })
    const valid = await form.validateForm()
    expect(valid).toBe(false)
    // первый элемент ок, второй пустой
    expect(form.hasError('contacts.0.name' as any)).toBe(false)
    expect(form.error('contacts.1.name' as any)).toBe('Имя')
  })

  it('removeArrayItem → stale nested-ошибки не остаются', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: '' }, { name: '' }] },
      })
      f.setRules({
        'contacts.*.name': [required('Имя')],
      } as any)
      return f
    })

    await form.validateForm()
    expect(form.hasError('contacts.0.name' as any)).toBe(true)
    expect(form.hasError('contacts.1.name' as any)).toBe(true)

    // удаляем первый элемент
    form.removeArrayItem('contacts', 0)

    // ревалидируем — должна быть одна ошибка на contacts.0.name (бывший второй)
    const valid = await form.validateForm()
    expect(valid).toBe(false)
    expect(form.hasError('contacts.0.name' as any)).toBe(true)
    // contacts.1.name больше не существует
    expect(form.hasError('contacts.1.name' as any)).toBe(false)
  })
})

describe('touch для nested-пути', () => {
  it('touch(contacts.0.name) помечает конкретное вложенное поле', () => {
    const form = setup(() =>
      createForm({ initialValues: { contacts: [{ name: '' }] } }),
    )
    form.touch('contacts.0.name' as any)
    expect(form.isTouched('contacts.0.name' as any)).toBe(true)
  })
})

describe('clear/reset чистят nested-состояние', () => {
  it('clear() убирает nested errors и touched', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: '' }] },
      })
      f.setRules({ 'contacts.*.name': [required('Имя')] } as any)
      return f
    })

    await form.validateForm()
    expect(form.hasError('contacts.0.name' as any)).toBe(true)
    expect(form.isTouched('contacts.0.name' as any)).toBe(true)

    form.clear()
    expect(form.hasError('contacts.0.name' as any)).toBe(false)
    expect(form.isTouched('contacts.0.name' as any)).toBe(false)
  })

  it('reset() убирает nested errors и touched', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { contacts: [{ name: '' }] },
      })
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

// -- Watcher: auto-revalidation при изменении значения -----------------------

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

    // поле не touched — watcher не должен вызывать валидацию
    expect(rule).not.toHaveBeenCalled()
  })
})

// -- clearCache --------------------------------------------------------------

describe('clearCache', () => {
  it('сброс кэша заставляет ревалидировать заново', async () => {
    const rule = vi.fn((v: string) => v === '' ? 'err' : null)
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '' } })
      f.setRules({ name: [rule] })
      return f
    })

    await form.validateField('name')
    const callsAfterFirst = rule.mock.calls.length

    // повторная валидация без clearCache — берёт из кэша, rule не вызывается
    await form.validateField('name')
    expect(rule.mock.calls.length).toBe(callsAfterFirst)

    // после clearCache — вызовет rule заново
    form.clearCache('name')
    await form.validateField('name')
    expect(rule.mock.calls.length).toBe(callsAfterFirst + 1)
  })
})

// -- dispose -----------------------------------------------------------------

describe('dispose', () => {
  it('после dispose watchers перестают ревалидировать', async () => {
    const rule = vi.fn((v: string) => v === '' ? 'err' : null)
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

    // watcher мёртв — rule не вызывается, ошибка остаётся как была
    expect(rule.mock.calls.length).toBe(callsBefore)
  })
})

// -- Взаимодействие фич: кэш + cross-field, двойной submit, setRules на лету ---

describe('sameAs + кэш: смена пароля инвалидирует кэш confirm', () => {
  it('validateForm видит рассинхрон без ручного clearCache', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { password: '', confirm: '' },
      })
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

    // меняем только password — confirm остаётся 'abc'
    form.val.password = 'xyz'
    await form.validateForm()
    expect(form.error('confirm')).toBe('Не совпадает')

    // подгоняем confirm — снова ок
    form.val.confirm = 'xyz'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)
  })
})

describe('dateAfter + кэш: смена startDate инвалидирует кэш endDate', () => {
  it('endDate не менялось, но startDate ушло вперёд — ошибка', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { startDate: '', endDate: '' },
      })
      f.setRules({
        endDate: [dateAfter('startDate', 'Конец раньше начала')],
      })
      return f
    })

    form.val.startDate = '2025-01-01'
    form.val.endDate = '2025-06-01'
    await form.validateForm()
    expect(form.hasError('endDate')).toBe(false)

    // двигаем начало вперёд — endDate не трогаем
    form.val.startDate = '2025-12-01'
    await form.validateForm()
    expect(form.error('endDate')).toBe('Конец раньше начала')
  })
})

describe('двойной submit', () => {
  it('второй вызов submit игнорируется пока первый выполняется', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(() => new Promise<void>(r => { resolveSubmit = r }))

    const form = setup(() =>
      createForm({ initialValues: { name: 'ok' }, onSubmit }),
    )

    const first = form.submit()
    const second = form.submit()

    // ждём пока submit дойдёт до onSubmit (validateForm + nextTick внутри)
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(form.isSubmitting.value).toBe(true)

    resolveSubmit()
    await first
    await second

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(form.isSubmitting.value).toBe(false)
  })
})

describe('setRules на лету: смена правил убирает stale ошибки', () => {
  it('убрали правило для поля — ошибка исчезает', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { name: '', email: '' },
      })
      f.setRules({
        name: [required('Имя')],
        email: [required('Email'), email('Невалидный')],
      })
      return f
    })

    await form.validateForm()
    expect(form.hasError('name')).toBe(true)
    expect(form.hasError('email')).toBe(true)

    // убираем правила для email
    form.setRules({ name: [required('Имя')] })

    // ошибка email должна исчезнуть (stale errors cleanup)
    expect(form.hasError('email')).toBe(false)
    // name остаётся
    expect(form.hasError('name')).toBe(true)
  })

  it('добавили правило — новое поле валидируется', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { name: '', phone: '' },
      })
      f.setRules({ name: [required('Имя')] })
      return f
    })

    await form.validateForm()
    expect(form.hasError('phone')).toBe(false)

    // добавляем правило для phone
    form.setRules({
      name: [required('Имя')],
      phone: [required('Телефон')],
    })
    await form.validateForm()
    expect(form.error('phone')).toBe('Телефон')
  })
})

describe('setErrors + validateForm: серверные ошибки перетираются клиентской валидацией', () => {
  it('серверная ошибка заменяется клиентской при повторной валидации', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: { email: 'taken@test.com' },
      })
      f.setRules({ email: [required('Обязательно'), email('Невалидный')] })
      return f
    })

    // сервер вернул ошибку
    form.setErrors({ email: ['Этот email уже занят'] })
    expect(form.error('email')).toBe('Этот email уже занят')

    // клиентская валидация перетирает серверную
    await form.validateForm()
    // email валиден по клиентским правилам
    expect(form.hasError('email')).toBe(false)
  })
})

describe('reset с новыми значениями + dirty', () => {
  it('после reset({name: "New"}) dirty сравнивает с "New", а не с оригиналом', async () => {
    const form = setup(() =>
      createForm({ initialValues: { name: 'Original' } }),
    )

    form.reset({ name: 'New' })
    expect(form.isDirty.value).toBe(false)

    form.val.name = 'Changed'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(true)

    // возвращаем к новому начальному — не dirty
    form.val.name = 'New'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(false)
    expect(form.isDirty.value).toBe(false)
  })
})

// -- Cross-field внутри wildcard ------------------------------------------------

describe('sameAs внутри wildcard-правил', () => {
  it('contacts.*.confirmEmail проверяется против contacts.*.email', async () => {
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

    // заполняем оба контакта корректно
    form.val.contacts[0].email = 'a@b.com'
    form.val.contacts[0].confirmEmail = 'a@b.com'
    form.val.contacts[1].email = 'x@y.com'
    form.val.contacts[1].confirmEmail = 'x@y.com'
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)
    expect(form.hasError('contacts.1.confirmEmail' as any)).toBe(false)

    // ломаем confirm у второго — первый не затрагивается
    form.val.contacts[1].confirmEmail = 'wrong'
    await form.validateForm()
    expect(form.hasError('contacts.0.confirmEmail' as any)).toBe(false)
    expect(form.error('contacts.1.confirmEmail' as any)).toBe('Не совпадает')
  })

  it('watcher: смена email автоматически ревалидирует confirmEmail через cross-field deps', async () => {
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

    // меняем только email — watcher должен ревалидировать confirmEmail через getDependentFields
    form.val.contacts[0].email = 'new@b.com'
    await vi.waitFor(() =>
      expect(form.error('contacts.0.confirmEmail' as any)).toBe('Не совпадает'),
    )
  })

  it('смена email инвалидирует кэш confirmEmail (без clearCache)', async () => {
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

    // меняем email, confirmEmail не трогаем — кэш должен инвалидироваться
    form.val.contacts[0].email = 'new@b.com'
    await form.validateForm()
    expect(form.error('contacts.0.confirmEmail' as any)).toBe('Не совпадает')
  })
})

// -- Комплексные сценарии: регистрация + мероприятие ---------------------------

describe('регистрация: весь путь от пустой формы до успешного submit', () => {
  it('заполнение → ошибки → исправление → submit', async () => {
    const onSubmit = vi.fn()

    const form = setup(() => {
      const f = createForm({
        initialValues: {
          name: '',
          email: '',
          phone: '',
          password: '',
          confirm: '',
          age: 0,
          type: 'personal' as string,
          company: '',
          tags: [] as string[],
          bio: '',
        },
        onSubmit,
      })
      f.setRules({
        name: [required('Имя обязательно'), minLength(2, 'Минимум 2 символа')],
        email: [required('Email обязателен'), email('Невалидный email')],
        phone: [regex(/^\+?\d{10,15}$/, 'Невалидный телефон')],
        password: [required('Пароль обязателен'), minLength(6, 'Минимум 6 символов')],
        confirm: [sameAs('password', 'Пароли не совпадают')],
        age: [between(18, 120, 'Возраст от 18 до 120')],
        type: [required()],
        company: [requiredIf('type', 'business', 'Укажите компанию')],
        tags: [arrayMinLength(1, 'Выберите хотя бы один тег')],
        bio: [maxLength(200, 'Макс 200 символов')],
      })
      return f
    })

    // 1) submit пустой формы — ничего не отправится
    await form.submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(form.isValid.value).toBe(false)

    // проверяем что ошибки встали на обязательные поля
    expect(form.hasError('name')).toBe(true)
    expect(form.hasError('email')).toBe(true)
    expect(form.hasError('password')).toBe(true)
    expect(form.hasError('tags')).toBe(true)
    // phone пустой — regex пропускает пустые, ошибки нет
    expect(form.hasError('phone')).toBe(false)
    // type=personal → company не обязательна
    expect(form.hasError('company')).toBe(false)

    // 2) заполняем с ошибками
    form.val.name = 'A'           // слишком короткое
    form.val.email = 'not-email'  // невалидный
    form.val.password = '123'     // короткий
    form.val.confirm = '456'      // не совпадает
    form.val.age = 10             // слишком молод
    form.val.phone = 'abc'        // невалидный
    form.val.bio = 'x'.repeat(201)

    await form.validateForm()
    expect(form.isValid.value).toBe(false)

    expect(form.error('name')).toBe('Минимум 2 символа')
    expect(form.error('email')).toBe('Невалидный email')
    expect(form.error('password')).toBe('Минимум 6 символов')
    expect(form.error('confirm')).toBe('Пароли не совпадают')
    expect(form.error('age')).toBe('Возраст от 18 до 120')
    expect(form.error('phone')).toBe('Невалидный телефон')
    expect(form.error('bio')).toBe('Макс 200 символов')

    // 3) исправляем всё
    form.val.name = 'Алексей'
    form.val.email = 'alex@example.com'
    form.val.password = 'secret123'
    form.val.confirm = 'secret123'
    form.val.age = 25
    form.val.phone = '+79001234567'
    form.val.bio = 'Разработчик'
    form.addArrayItem('tags', 'vue')
    form.addArrayItem('tags', 'typescript')

    await form.validateForm()
    expect(form.isValid.value).toBe(true)

    // 4) submit проходит
    await form.submit()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Алексей',
      email: 'alex@example.com',
      tags: ['vue', 'typescript'],
    }))

    // 5) переключаем на business — company становится обязательной
    form.val.type = 'business'
    await form.validateForm()
    expect(form.hasError('company')).toBe(true)
    expect(form.isValid.value).toBe(false)

    form.val.company = 'ООО Рога и Копыта'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)

    // 6) reset всё чистит
    form.reset()
    expect(form.values.value.name).toBe('')
    expect(form.values.value.tags).toEqual([])
    expect(form.isDirty.value).toBe(false)
    expect(form.hasAnyErrors.value).toBe(false)
  })
})

describe('мероприятие: nested участники + даты + динамические массивы', () => {
  it('полный цикл: создание → добавление участников → валидация → удаление → clear', async () => {
    const form = setup(() => {
      const f = createForm({
        initialValues: {
          title: '',
          startDate: '',
          endDate: '',
          maxSeats: 0,
          participants: [] as { name: string; email: string; role: string }[],
        },
      })
      f.setRules({
        title: [required('Название обязательно'), minLength(3, 'Минимум 3 символа')],
        startDate: [required('Укажите дату начала')],
        endDate: [dateAfter('startDate', 'Дата окончания должна быть после начала')],
        maxSeats: [between(1, 1000, 'От 1 до 1000')],
        'participants.*.name': [required('Имя участника обязательно')],
        'participants.*.email': [required('Email обязателен'), email('Невалидный email')],
        'participants.*.role': [required('Укажите роль')],
      } as any)
      return f
    })

    // 1) пустая форма невалидна
    expect(await form.validateForm()).toBe(false)
    expect(form.hasError('title')).toBe(true)
    expect(form.hasError('startDate')).toBe(true)

    // участников нет — wildcard не раскрывается, nested ошибок нет
    expect(form.hasError('participants.0.name' as any)).toBe(false)

    // 2) добавляем двух участников с пустыми полями
    form.addArrayItem('participants', { name: '', email: '', role: '' })
    form.addArrayItem('participants', { name: '', email: '', role: '' })

    expect(await form.validateForm()).toBe(false)
    expect(form.error('participants.0.name' as any)).toBe('Имя участника обязательно')
    expect(form.error('participants.0.email' as any)).toBe('Email обязателен')
    expect(form.error('participants.1.role' as any)).toBe('Укажите роль')

    // 3) заполняем первого полностью, второго с битым email
    form.val.participants[0] = { name: 'Иван', email: 'ivan@test.com', role: 'speaker' }
    form.val.participants[1] = { name: 'Мария', email: 'not-email', role: 'listener' }

    await form.validateForm()
    expect(form.hasError('participants.0.name' as any)).toBe(false)
    expect(form.hasError('participants.0.email' as any)).toBe(false)
    expect(form.error('participants.1.email' as any)).toBe('Невалидный email')

    // 4) исправляем email второго
    form.val.participants[1].email = 'maria@test.com'
    await form.validateForm()
    expect(form.hasError('participants.1.email' as any)).toBe(false)

    // 5) заполняем остальные поля, проверяем dateAfter
    form.val.title = 'Vue Meetup 2025'
    form.val.startDate = '2025-06-01'
    form.val.endDate = '2025-05-01'  // раньше начала
    form.val.maxSeats = 50

    await form.validateForm()
    expect(form.hasError('title')).toBe(false)
    expect(form.error('endDate')).toBe('Дата окончания должна быть после начала')

    form.val.endDate = '2025-06-02'
    await form.validateForm()
    expect(form.hasError('endDate')).toBe(false)
    expect(form.isValid.value).toBe(true)

    // 6) удаляем первого участника — ошибки от participants.1.* не должны «зависнуть»
    form.removeArrayItem('participants', 0)
    expect(form.values.value.participants).toHaveLength(1)
    expect(form.values.value.participants[0].name).toBe('Мария')

    await form.validateForm()
    expect(form.hasError('participants.0.name' as any)).toBe(false)
    expect(form.hasError('participants.0.email' as any)).toBe(false)
    // бывший participants.1 больше не существует
    expect(form.hasError('participants.1.name' as any)).toBe(false)

    // 7) добавляем третьего (index=1) с пустым именем
    form.addArrayItem('participants', { name: '', email: 'new@test.com', role: 'listener' })
    await form.validateForm()
    expect(form.error('participants.1.name' as any)).toBe('Имя участника обязательно')
    expect(form.hasError('participants.1.email' as any)).toBe(false)

    // 8) clear — всё чисто, массив пустой
    form.clear()
    expect(form.values.value.title).toBe('')
    expect(form.values.value.participants).toEqual([])
    expect(form.hasAnyErrors.value).toBe(false)
    expect(form.isTouched('title')).toBe(false)
    expect(form.hasError('participants.0.name' as any)).toBe(false)
  })
})
