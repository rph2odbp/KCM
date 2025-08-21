export function defaultRolesForEmail(email: string) {
  const lower = (email || '').toLowerCase()
  const base = ['parent', 'staff']
  const adminEmails = new Set<string>(['ryanhallford.br@gmail.com', 'ryanhallford.tx@gmail.com'])
  return adminEmails.has(lower) ? [...base, 'admin'] : base
}
