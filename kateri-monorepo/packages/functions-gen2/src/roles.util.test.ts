import { describe, it, expect } from 'vitest'
import { defaultRolesForEmail } from './roles.util.js'

describe('defaultRolesForEmail', () => {
  it('grants parent and staff by default', () => {
    expect(defaultRolesForEmail('someone@example.com')).toEqual(['parent', 'staff'])
  })
  it('grants admin when email is whitelisted', () => {
    expect(defaultRolesForEmail('ryanhallford.br@gmail.com')).toEqual(['parent', 'staff', 'admin'])
  })
})
