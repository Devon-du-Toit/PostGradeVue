export type UserRole = 'ADMIN' | 'LECTURER' | 'MARKER'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: UserRole
}
