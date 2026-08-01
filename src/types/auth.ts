import type { User } from 'firebase/auth'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  configurationError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

