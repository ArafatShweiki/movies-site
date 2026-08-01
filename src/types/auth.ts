import type { User } from 'firebase/auth'
import type { ProfileDetails, UserProfile } from './profile'

export interface RegistrationDetails
  extends Pick<ProfileDetails, 'firstName' | 'lastName'> {
  readonly email: string
  readonly password: string
}

export interface AuthContextValue {
  user: User | null
  loading: boolean
  configurationError: string | null
  profile: UserProfile | null
  profileLoading: boolean
  profileError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (details: RegistrationDetails) => Promise<void>
  loginWithGoogle: () => Promise<void>
  saveProfile: (profile: ProfileDetails) => Promise<void>
  logout: () => Promise<void>
}
