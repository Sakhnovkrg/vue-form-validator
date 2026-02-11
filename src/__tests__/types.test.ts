import { describe, it, expectTypeOf } from 'vitest'
import { effectScope, computed } from 'vue'
import { createForm } from '../forms/core'
import {
  createForm as createFormPublic,
  createRules,
  type Rule,
} from '../forms/index'
import { required, between } from '../rules/basic'
import { arrayMinLength } from '../rules/array'

const scope = effectScope()

function make() {
  return scope.run(() =>
    createForm({
      initialValues: {
        name: '',
        age: 0,
        active: false,
        tags: [] as string[],
        contacts: [{ email: '', phone: '' }],
        address: { street: '', city: '' },
      },
    })
  )!
}

describe('вывод типов из initialValues', () => {
  it('примитивы', () => {
    const form = make()
    expectTypeOf(form.val.name).toBeString()
    expectTypeOf(form.val.age).toBeNumber()
    expectTypeOf(form.val.active).toBeBoolean()
  })

  it('массивы и объекты', () => {
    const form = make()
    expectTypeOf(form.val.tags).toEqualTypeOf<string[]>()
    expectTypeOf(form.val.contacts).toEqualTypeOf<
      { email: string; phone: string }[]
    >()
    expectTypeOf(form.val.address).toEqualTypeOf<{
      street: string
      city: string
    }>()
  })

  it('values.value совпадает с T', () => {
    const form = make()
    expectTypeOf(form.values.value).toHaveProperty('name')
    expectTypeOf(form.values.value).toHaveProperty('tags')
  })
})

describe('val: типобезопасный доступ', () => {
  it('принимает правильные типы', () => {
    const form = make()
    form.val.name = 'test'
    form.val.age = 25

    // @ts-expect-error — несуществующее поле
    void form.val.nonExistent

    // @ts-expect-error — неверный тип
    form.val.name = 123
  })
})

describe('методы с перегрузками для nested-путей', () => {
  it('принимает top-level ключи', () => {
    const form = make()
    form.validateField('name')
    form.touch('age')
    form.hasError('tags')
    form.error('name')
    form.isTouched('name')

    // @ts-expect-error — несуществующее поле
    form.validateField('nonExistent')

    // @ts-expect-error — несуществующее поле
    form.touch('nope')
  })

  it('принимает nested-пути для массивов объектов', () => {
    const form = make()
    form.hasError('contacts.0.email')
    form.touch('contacts.0.phone')
    form.error('contacts.5.email')
    form.isTouched('tags.0')

    // @ts-expect-error — несуществующее свойство в элементе
    form.hasError('contacts.0.nonExistent')
  })

  it('принимает nested-пути для объектов', () => {
    const form = make()
    form.hasError('address.street')
    form.error('address.city')

    // @ts-expect-error — несуществующее свойство
    form.hasError('address.zip')
  })
})

describe('addArrayItem: типизация элементов', () => {
  it('строковый массив принимает строку', () => {
    const form = make()
    form.addArrayItem('tags', 'vue')

    // @ts-expect-error — число в строковый массив
    form.addArrayItem('tags', 123)
  })

  it('массив объектов принимает полный объект', () => {
    const form = make()
    form.addArrayItem('contacts', { email: 'a@b.com', phone: '123' })

    // @ts-expect-error — неполный объект
    form.addArrayItem('contacts', { email: 'a@b.com' })
  })

  it('toggleArrayItem и arrayIncludes типизированы', () => {
    const form = make()
    form.toggleArrayItem('tags', 'vue')
    form.arrayIncludes('tags', 'react')

    // @ts-expect-error — число вместо строки
    form.toggleArrayItem('tags', 42)
  })
})

describe('arrayPath / objectPath: возвращаемый тип', () => {
  it('arrayPath возвращает template literal', () => {
    const form = make()
    const path = form.arrayPath('contacts', 0, 'email')
    expectTypeOf(path).toEqualTypeOf<`contacts.${number}.email`>()

    // @ts-expect-error — несуществующее свойство
    form.arrayPath('contacts', 0, 'nonExistent')
  })

  it('objectPath возвращает template literal', () => {
    const form = make()
    const path = form.objectPath('address', 'street')
    expectTypeOf(path).toEqualTypeOf<`address.street`>()

    // @ts-expect-error — несуществующее свойство
    form.objectPath('address', 'zip')
  })
})

describe('setRules принимает Partial правил', () => {
  it('принимает правила для подмножества полей', () => {
    const form = make()
    form.setRules({ name: [required()], age: [between(0, 120)] })
    form.setRules({ tags: [arrayMinLength(1)] })
  })
})

describe('setValues / reset: Partial<T>', () => {
  it('setValues принимает подмножество', () => {
    const form = make()
    form.setValues({ name: 'test' })
    form.setValues({ age: 25, name: 'test' })

    // @ts-expect-error — неверный тип
    form.setValues({ name: 123 })
  })

  it('reset принимает подмножество', () => {
    const form = make()
    form.reset()
    form.reset({ name: 'new' })

    // @ts-expect-error — неверный тип
    form.reset({ age: 'not a number' })
  })
})

describe('getValues возвращает T', () => {
  it('тип включает все поля', () => {
    const form = make()
    const v = form.getValues()
    expectTypeOf(v.name).toBeString()
    expectTypeOf(v.age).toBeNumber()
    expectTypeOf(v.tags).toEqualTypeOf<string[]>()
  })
})

describe('createForm с computed правилами для подмножества полей', () => {
  it('принимает computed с массивом правил для подмножества полей', () => {
    scope.run(() => {
      const rules = computed(() => ({
        email: [required('Required')],
      }))
      const form = createFormPublic({ name: '', age: 0, email: '' }, rules)
      expectTypeOf(form.val.name).toBeString()
      expectTypeOf(form.val.email).toBeString()
    })
  })

  it('принимает computed с RuleChain для подмножества полей', () => {
    scope.run(() => {
      const r = createRules()
      const rules = computed(() => ({
        email: r.required().email(),
      }))
      const form = createFormPublic(
        { name: '', age: 0, email: '', city_id: null as number | null },
        rules
      )
      expectTypeOf(form.val.name).toBeString()
    })
  })

  it('воспроизводит кейс со скрина: много полей, nullable, RuleChain в computed', () => {
    scope.run(() => {
      const r = createRules()
      // Реальный кейс: форма регистрации с nullable полями и правилами только для 2 из 8
      type RegisterRequest = {
        name: string
        surname: string
        patronymic: string
        email: string
        iin: string
        birthdate: string
        city_id: number | null
        gender: string | null
      }
      const rules = computed(() => ({
        iin: r.required().minLength(12),
        email: r.required().email(),
      }))
      const form = createFormPublic(
        {
          name: '',
          surname: '',
          patronymic: '',
          email: '',
          iin: '',
          birthdate: '',
          city_id: null,
          gender: null,
        } as RegisterRequest,
        rules
      )
      expectTypeOf(form.val.name).toBeString()
      expectTypeOf(form.val.iin).toBeString()
    })
  })

  it('принимает callback с неполным набором правил', () => {
    scope.run(() => {
      const form = createFormPublic({ name: '', age: 0, email: '' }, r => ({
        email: r.required().email(),
      }))
      expectTypeOf(form.val.name).toBeString()
    })
  })

  it('RuleChain<string> совместим с nullable полями (string | null) в computed', () => {
    scope.run(() => {
      const r = createRules()
      // Кейс: поле email имеет тип string | null, а правило .email() возвращает RuleChain<string>
      // До фикса FormRules требовал Rule<string | null>, а RuleChain<string> не совместим
      // из-за контравариантности параметров функций
      type NullableForm = {
        email: string | null
        phone: string | null
        city_id: number | null
        name: string
      }
      const rules = computed(() => ({
        email: r.required().email(),
        phone: r.required().minLength(10),
      }))
      const form = createFormPublic(
        {
          email: null,
          phone: null,
          city_id: null,
          name: '',
        } as NullableForm,
        rules
      )
      expectTypeOf(form.val.email).toEqualTypeOf<string | null>()
      expectTypeOf(form.val.name).toBeString()
    })
  })

  it('RuleChain совместим с nullable полями в callback-стиле', () => {
    scope.run(() => {
      type NullableForm = {
        email: string | null
        age: number | null
      }
      const form = createFormPublic(
        { email: null, age: null } as NullableForm,
        r => ({
          email: r.required().email(),
          age: r.required().numeric(),
        })
      )
      expectTypeOf(form.val.email).toEqualTypeOf<string | null>()
      expectTypeOf(form.val.age).toEqualTypeOf<number | null>()
    })
  })

  it('Rule<T> и Rule<NonNullable<T>> оба принимаются для nullable полей', () => {
    scope.run(() => {
      type FormWithNullable = {
        status: string | null
      }
      // Rule<string> — правило для строго string
      const strictRule: Rule<string> = v => (!v ? 'required' : null)
      // Rule<string | null> — правило, явно принимающее null
      const nullableRule: Rule<string | null> = v =>
        v === null ? 'cannot be null' : null

      const form1 = createFormPublic(
        { status: null } as FormWithNullable,
        () => ({ status: [strictRule] })
      )
      const form2 = createFormPublic(
        { status: null } as FormWithNullable,
        () => ({ status: [nullableRule] })
      )
      expectTypeOf(form1.val.status).toEqualTypeOf<string | null>()
      expectTypeOf(form2.val.status).toEqualTypeOf<string | null>()
    })
  })
})

describe('onSubmit типизирован по T', () => {
  it('колбэк получает правильный тип', () => {
    scope.run(() =>
      createForm({
        initialValues: { name: '', age: 0 },
        onSubmit(values) {
          expectTypeOf(values).toEqualTypeOf<{ name: string; age: number }>()
        },
      })
    )
  })
})
