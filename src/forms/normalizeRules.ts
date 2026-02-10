import type { Rule, RuleChain } from './types'

type RuleInput =
  | Rule<any>
  | RuleChain<any>
  | Array<Rule<any> | RuleChain<any>>
  | undefined

function isRuleChain(value: unknown): value is RuleChain<any> {
  return typeof value === 'function' && Array.isArray((value as any).__rules)
}

function collectRuleInput(
  input: RuleInput,
  bucket: Rule<any>[],
  seen: Set<Rule<any>>
): void {
  if (!input) return
  if (Array.isArray(input)) {
    input.forEach(item => collectRuleInput(item, bucket, seen))
    return
  }
  if (typeof input === 'function') {
    if (isRuleChain(input)) {
      input.__rules.forEach(rule => {
        if (!seen.has(rule)) {
          seen.add(rule)
          bucket.push(rule)
        }
      })
    } else if (!seen.has(input)) {
      seen.add(input)
      bucket.push(input)
    }
  }
}

export function normalizeFormRules<T extends Record<string, any>, R>(
  rules: R
): Partial<{ [K in keyof T]: Rule<T[K]>[] }> {
  const normalized: Partial<{ [K in keyof T]: Rule<T[K]>[] }> = {}

  if (!rules) {
    return normalized
  }

  Object.keys(rules).forEach(key => {
    const field = key as keyof T
    const bucket: Rule<any>[] = []
    collectRuleInput((rules as any)[field] as RuleInput, bucket, new Set())
    normalized[field] = bucket
  })

  return normalized
}
