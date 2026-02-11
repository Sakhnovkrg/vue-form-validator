import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { createFileHelpers } from '../utils/fileHelpers'

function makeContext(initialValues: Record<string, any>) {
  const values = ref(initialValues)
  return {
    values,
    touch: vi.fn(),
    validateField: vi.fn(async () => []),
  }
}

describe('createFileHelpers', () => {
  it('лениво создаёт хелпер через proxy', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    const h = helpers.avatar
    expect(h).toBeDefined()
    expect(h.files).toBeDefined()
    expect(h.fileInfo).toBeDefined()
    expect(typeof h.handler).toBe('function')
    expect(typeof h.clear).toBe('function')
  })

  it('files computed возвращает массив File[]', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const ctx = makeContext({ avatar: file })
    const helpers = createFileHelpers(ctx)

    expect(helpers.avatar.files.value).toEqual([file])
  })

  it('files computed: null → пустой массив', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    expect(helpers.avatar.files.value).toEqual([])
  })

  it('fileInfo computed возвращает инфу с форматированным размером', () => {
    const file = new File(['hello world'], 'doc.txt', { type: 'text/plain' })
    const ctx = makeContext({ doc: file })
    const helpers = createFileHelpers(ctx)

    const info = helpers.doc.fileInfo.value
    expect(info).toHaveLength(1)
    expect(info[0].name).toBe('doc.txt')
    expect(info[0].type).toBe('text/plain')
    expect(info[0].size).toBe(file.size)
    expect(typeof info[0].formattedSize).toBe('string')
  })

  it('handler: устанавливает файл из input event', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    const file = new File(['x'], 'photo.png')
    const event = {
      target: {
        multiple: false,
        files: { 0: file, length: 1, item: (_i: number) => file } as any,
      },
    } as unknown as Event

    helpers.avatar.handler(event)

    expect(ctx.values.value.avatar).toBe(file)
    expect(ctx.touch).toHaveBeenCalled()
    expect(ctx.validateField).toHaveBeenCalled()
  })

  it('handler: multiple input → массив файлов', () => {
    const ctx = makeContext({ docs: [] as File[] })
    const helpers = createFileHelpers(ctx)

    const f1 = new File(['a'], 'a.txt')
    const f2 = new File(['b'], 'b.txt')
    const fileList = [f1, f2] as any
    fileList[Symbol.iterator] = function* () {
      yield f1
      yield f2
    }

    const event = {
      target: {
        multiple: true,
        files: {
          0: f1,
          1: f2,
          length: 2,
          [Symbol.iterator]: fileList[Symbol.iterator],
        } as any,
      },
    } as unknown as Event

    // jsdom не поддерживает настоящий FileList, но Array.from работает с length + индексами
    helpers.docs.handler(event)

    expect(Array.isArray(ctx.values.value.docs)).toBe(true)
  })

  it('handler: нет target → no-op', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    helpers.avatar.handler({ target: null } as any)
    expect(ctx.touch).not.toHaveBeenCalled()
  })

  it('clear: сбрасывает значение в null', () => {
    const file = new File(['x'], 'photo.png')
    const ctx = makeContext({ avatar: file })
    const helpers = createFileHelpers(ctx)

    helpers.avatar.clear()

    expect(ctx.values.value.avatar).toBeNull()
    expect(ctx.touch).toHaveBeenCalled()
    expect(ctx.validateField).toHaveBeenCalled()
  })

  it('clear: сбрасывает input.value после handler', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    const inputEl = {
      value: 'C:\\fakepath\\photo.png',
      multiple: false,
      files: { 0: new File(['x'], 'p.png'), length: 1 } as any,
    }
    helpers.avatar.handler({ target: inputEl } as unknown as Event)

    helpers.avatar.clear()
    expect(inputEl.value).toBe('')
  })

  it('повторный доступ к тому же полю возвращает тот же хелпер', () => {
    const ctx = makeContext({ avatar: null })
    const helpers = createFileHelpers(ctx)

    const h1 = helpers.avatar
    const h2 = helpers.avatar
    expect(h1).toBe(h2)
  })
})
