export const PROFILE_NAME_MAX_LENGTH = 50

export interface ProfileNames {
  readonly firstName: string
  readonly lastName: string
}

export interface ProfileDetails extends ProfileNames {
  readonly region: string
  readonly phoneNumber: string
}

export interface UserProfile extends ProfileDetails {
  readonly updatedAt: number
}
