import { describe, it, expectTypeOf } from 'vitest'
import { effectScope } from 'vue'
import { createForm } from '../forms/core'
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
    }),
  )!
}

// -- Вывод типов --------------------------------------------------------------

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
    expectTypeOf(form.val.contacts).toEqualTypeOf<{ email: string; phone: string }[]>()
    expectTypeOf(form.val.address).toEqualTypeOf<{ street: string; city: string }>()
  })

  it('values.value совпадает с T', () => {
    const form = make()
    expectTypeOf(form.values.value).toHaveProperty('name')
    expectTypeOf(form.values.value).toHaveProperty('tags')
  })
})

// -- val: типобезопасный доступ -----------------------------------------------

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

// -- Nested-пути: validateField, touch, hasError и т.д. -----------------------

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

// -- Массивы: addArrayItem, toggleArrayItem, arrayIncludes --------------------

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

// -- arrayPath / objectPath ---------------------------------------------------

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

// -- setRules / setValues / reset ---------------------------------------------

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

// -- getValues / onSubmit: возвращаемый тип -----------------------------------

describe('getValues возвращает T', () => {
  it('тип включает все поля', () => {
    const form = make()
    const v = form.getValues()
    expectTypeOf(v.name).toBeString()
    expectTypeOf(v.age).toBeNumber()
    expectTypeOf(v.tags).toEqualTypeOf<string[]>()
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
      }),
    )
  })
})
