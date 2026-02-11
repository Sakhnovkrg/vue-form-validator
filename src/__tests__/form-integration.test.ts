import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createForm } from '../forms/core'
import {
  required,
  minLength,
  maxLength,
  email,
  between,
  regex,
} from '../rules/basic'
import {
  remote,
  custom,
  sameAs,
  requiredIf,
  dateAfter,
} from '../rules/advanced'
import { arrayMinLength } from '../rules/array'
import type { FormInstance } from '../forms/types'

let _scope: ReturnType<typeof effectScope>
function setup<T extends Record<string, any>>(fn: () => FormInstance<T>) {
  _scope = effectScope()
  return _scope.run(fn)!
}
afterEach(() => _scope?.stop())

describe('гонка: clear() во время async-валидации', () => {
  it('результат отменённой валидации не всплывает', async () => {
    vi.useFakeTimers()

    let resolve!: (ok: boolean) => void
    const check = vi.fn(
      () =>
        new Promise<boolean>(r => {
          resolve = r
        })
    )

    const form = setup(() => {
      const f = createForm({ initialValues: { username: '' } })
      f.setRules({ username: [remote(check, 'Занято', 10)] })
      return f
    })

    form.val.username = 'test'
    form.touch('username')
    const pending = form.validateField('username')
    vi.advanceTimersByTime(10)

    form.clear()

    resolve(false)
    await pending.catch(() => {})
    await nextTick()

    expect(form.hasError('username')).toBe(false)
    expect(form.validating('username')).toBe(false)

    vi.useRealTimers()
  })
})

describe('custom() — sync vs async', () => {
  it('sync: isValidating остаётся false', async () => {
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
        code: [
          custom(
            () =>
              new Promise<boolean>(r => {
                resolve = r
              }),
            'Нет'
          ),
        ],
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

describe('двойной submit', () => {
  it('второй вызов игнорируется пока первый выполняется', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>(r => {
          resolveSubmit = r
        })
    )

    const form = setup(() =>
      createForm({ initialValues: { name: 'ok' }, onSubmit })
    )

    const first = form.submit()
    const second = form.submit()

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(form.isSubmitting.value).toBe(true)

    resolveSubmit()
    await first
    await second

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(form.isSubmitting.value).toBe(false)
  })
})

describe('setRules на лету', () => {
  it('убрали правило — stale ошибка исчезает', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '', email: '' } })
      f.setRules({
        name: [required('Имя')],
        email: [required('Email'), email('Невалидный')],
      })
      return f
    })

    await form.validateForm()
    expect(form.hasError('name')).toBe(true)
    expect(form.hasError('email')).toBe(true)

    form.setRules({ name: [required('Имя')] })
    expect(form.hasError('email')).toBe(false)
    expect(form.hasError('name')).toBe(true)
  })

  it('добавили правило — новое поле валидируется', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { name: '', phone: '' } })
      f.setRules({ name: [required('Имя')] })
      return f
    })

    await form.validateForm()
    expect(form.hasError('phone')).toBe(false)

    form.setRules({
      name: [required('Имя')],
      phone: [required('Телефон')],
    })
    await form.validateForm()
    expect(form.error('phone')).toBe('Телефон')
  })
})

describe('setErrors + validateForm', () => {
  it('серверная ошибка перетирается клиентской валидацией', async () => {
    const form = setup(() => {
      const f = createForm({ initialValues: { email: 'taken@test.com' } })
      f.setRules({ email: [required('Обязательно'), email('Невалидный')] })
      return f
    })

    form.setErrors({ email: ['Этот email уже занят'] })
    expect(form.error('email')).toBe('Этот email уже занят')

    await form.validateForm()
    expect(form.hasError('email')).toBe(false)
  })
})

describe('reset с новыми значениями + dirty', () => {
  it('dirty сравнивает с новыми начальными значениями', async () => {
    const form = setup(() =>
      createForm({ initialValues: { name: 'Original' } })
    )

    form.reset({ name: 'New' })
    expect(form.isDirty.value).toBe(false)

    form.val.name = 'Changed'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(true)

    form.val.name = 'New'
    await nextTick()
    expect(form.isFieldDirty('name')).toBe(false)
  })
})

describe('регистрация: полный цикл', () => {
  it('пустая форма → ошибки → исправление → submit → requiredIf → reset', async () => {
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
        password: [
          required('Пароль обязателен'),
          minLength(6, 'Минимум 6 символов'),
        ],
        confirm: [sameAs('password', 'Пароли не совпадают')],
        age: [between(18, 120, 'Возраст от 18 до 120')],
        type: [required()],
        company: [requiredIf('type', 'business', 'Укажите компанию')],
        tags: [arrayMinLength(1, 'Выберите хотя бы один тег')],
        bio: [maxLength(200, 'Макс 200 символов')],
      })
      return f
    })

    // submit пустой формы
    await form.submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(form.hasError('name')).toBe(true)
    expect(form.hasError('email')).toBe(true)
    expect(form.hasError('password')).toBe(true)
    expect(form.hasError('tags')).toBe(true)
    expect(form.hasError('phone')).toBe(false)
    expect(form.hasError('company')).toBe(false)

    // заполняем с ошибками
    form.val.name = 'A'
    form.val.email = 'not-email'
    form.val.password = '123'
    form.val.confirm = '456'
    form.val.age = 10
    form.val.phone = 'abc'
    form.val.bio = 'x'.repeat(201)

    await form.validateForm()
    expect(form.error('name')).toBe('Минимум 2 символа')
    expect(form.error('email')).toBe('Невалидный email')
    expect(form.error('password')).toBe('Минимум 6 символов')
    expect(form.error('confirm')).toBe('Пароли не совпадают')
    expect(form.error('age')).toBe('Возраст от 18 до 120')
    expect(form.error('phone')).toBe('Невалидный телефон')
    expect(form.error('bio')).toBe('Макс 200 символов')

    // исправляем
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

    await form.submit()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Алексей',
        email: 'alex@example.com',
        tags: ['vue', 'typescript'],
      })
    )

    // requiredIf: переключаем на business
    form.val.type = 'business'
    await form.validateForm()
    expect(form.hasError('company')).toBe(true)

    form.val.company = 'ООО Рога и Копыта'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)

    // reset
    form.reset()
    expect(form.values.value.name).toBe('')
    expect(form.values.value.tags).toEqual([])
    expect(form.isDirty.value).toBe(false)
    expect(form.hasAnyErrors.value).toBe(false)
  })
})

describe('create/edit форма: паттерн переиспользования', () => {
  function createUserForm(onSubmit: (values: any) => void | Promise<void>) {
    return createForm({
      initialValues: {
        name: '',
        email: '',
        avatar: null as File | null,
      },
      onSubmit,
    })
  }

  function applyUserRules(form: ReturnType<typeof createUserForm>) {
    form.setRules({
      name: [required('Имя обязательно'), minLength(2, 'Минимум 2')],
      email: [required('Email обязателен'), email('Невалидный email')],
    })
  }

  it('create: пустая форма → валидация → заполнение → submit', async () => {
    const onSubmit = vi.fn()
    const form = setup(() => {
      const f = createUserForm(onSubmit)
      applyUserRules(f)
      return f
    })

    await form.submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(form.hasError('name')).toBe(true)
    expect(form.hasError('email')).toBe(true)

    form.val.name = 'Алексей'
    form.val.email = 'alex@test.com'

    await form.submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Алексей', email: 'alex@test.com' })
    )
  })

  it('edit: загрузка данных через reset → isDirty=false', async () => {
    const onSubmit = vi.fn()
    const form = setup(() => {
      const f = createUserForm(onSubmit)
      applyUserRules(f)
      return f
    })

    form.reset({ name: 'Иван', email: 'ivan@test.com' })

    expect(form.val.name).toBe('Иван')
    expect(form.val.email).toBe('ivan@test.com')
    expect(form.isDirty.value).toBe(false)
    expect(form.hasAnyErrors.value).toBe(false)
  })

  it('edit: изменение после загрузки → isDirty=true → submit', async () => {
    const onSubmit = vi.fn()
    const form = setup(() => {
      const f = createUserForm(onSubmit)
      applyUserRules(f)
      return f
    })

    form.reset({ name: 'Иван', email: 'ivan@test.com' })

    form.val.email = 'ivan-new@test.com'
    await nextTick()
    expect(form.isDirty.value).toBe(true)
    expect(form.isFieldDirty('email')).toBe(true)
    expect(form.isFieldDirty('name')).toBe(false)

    await form.submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Иван', email: 'ivan-new@test.com' })
    )
  })

  it('edit: setErrors для серверных ошибок после submit', async () => {
    const onSubmit = vi.fn(async (_values: any) => {
      throw new Error('server')
    })

    const form = setup(() => {
      const f = createUserForm(async values => {
        await onSubmit(values)
      })
      applyUserRules(f)
      return f
    })

    form.reset({ name: 'Иван', email: 'taken@test.com' })
    form.val.name = 'Иван2'

    await form.submit().catch(() => {})

    form.setErrors({ email: ['Этот email уже занят'] })
    expect(form.error('email')).toBe('Этот email уже занят')

    await form.validateForm()
    expect(form.hasError('email')).toBe(false)
  })

  it('edit: setValues делает форму dirty (неправильный паттерн для загрузки)', async () => {
    const form = setup(() => {
      const f = createUserForm(vi.fn())
      applyUserRules(f)
      return f
    })

    form.setValues({ name: 'Loaded', email: 'loaded@test.com' })
    await nextTick()

    expect(form.val.name).toBe('Loaded')
    expect(form.isDirty.value).toBe(true)
  })

  it('reset после редактирования возвращает к загруженным данным', async () => {
    const form = setup(() => {
      const f = createUserForm(vi.fn())
      applyUserRules(f)
      return f
    })

    form.reset({ name: 'Иван', email: 'ivan@test.com' })
    form.val.name = 'Изменено'
    form.val.email = 'changed@test.com'

    form.reset()
    expect(form.val.name).toBe('Иван')
    expect(form.val.email).toBe('ivan@test.com')
    expect(form.isDirty.value).toBe(false)
  })
})

describe('мероприятие: nested + даты + динамические массивы', () => {
  it('полный цикл с участниками, датами и wildcard-правилами', async () => {
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
        title: [
          required('Название обязательно'),
          minLength(3, 'Минимум 3 символа'),
        ],
        startDate: [required('Укажите дату начала')],
        endDate: [
          dateAfter('startDate', 'Дата окончания должна быть после начала'),
        ],
        maxSeats: [between(1, 1000, 'От 1 до 1000')],
        'participants.*.name': [required('Имя участника обязательно')],
        'participants.*.email': [
          required('Email обязателен'),
          email('Невалидный email'),
        ],
        'participants.*.role': [required('Укажите роль')],
      } as any)
      return f
    })

    expect(await form.validateForm()).toBe(false)
    expect(form.hasError('title')).toBe(true)
    expect(form.hasError('participants.0.name' as any)).toBe(false)

    // добавляем участников
    form.addArrayItem('participants', { name: '', email: '', role: '' })
    form.addArrayItem('participants', { name: '', email: '', role: '' })

    expect(await form.validateForm()).toBe(false)
    expect(form.error('participants.0.name' as any)).toBe(
      'Имя участника обязательно'
    )
    expect(form.error('participants.0.email' as any)).toBe('Email обязателен')

    // заполняем: первый ок, второй с битым email
    form.val.participants[0] = {
      name: 'Иван',
      email: 'ivan@test.com',
      role: 'speaker',
    }
    form.val.participants[1] = {
      name: 'Мария',
      email: 'not-email',
      role: 'listener',
    }

    await form.validateForm()
    expect(form.hasError('participants.0.email' as any)).toBe(false)
    expect(form.error('participants.1.email' as any)).toBe('Невалидный email')

    form.val.participants[1].email = 'maria@test.com'
    await form.validateForm()
    expect(form.hasError('participants.1.email' as any)).toBe(false)

    // основные поля + dateAfter
    form.val.title = 'Vue Meetup 2025'
    form.val.startDate = '2025-06-01'
    form.val.endDate = '2025-05-01'
    form.val.maxSeats = 50

    await form.validateForm()
    expect(form.error('endDate')).toBe(
      'Дата окончания должна быть после начала'
    )

    form.val.endDate = '2025-06-02'
    await form.validateForm()
    expect(form.isValid.value).toBe(true)

    // удаление участника — stale ошибки не зависают
    form.removeArrayItem('participants', 0)
    expect(form.values.value.participants[0].name).toBe('Мария')

    await form.validateForm()
    expect(form.hasError('participants.0.name' as any)).toBe(false)
    expect(form.hasError('participants.1.name' as any)).toBe(false)

    // добавляем нового с пустым именем
    form.addArrayItem('participants', {
      name: '',
      email: 'new@test.com',
      role: 'listener',
    })
    await form.validateForm()
    expect(form.error('participants.1.name' as any)).toBe(
      'Имя участника обязательно'
    )

    // clear
    form.clear()
    expect(form.values.value.participants).toEqual([])
    expect(form.hasAnyErrors.value).toBe(false)
  })
})
