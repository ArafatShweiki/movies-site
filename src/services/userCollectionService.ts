import type { Database } from 'firebase/database'

type CollectionErrorFactory = () => Error

export function requireAuthenticatedUserId(
  userId: string | null | undefined,
  createError: CollectionErrorFactory,
): string {
  const normalizedUserId = userId?.trim()

  if (!normalizedUserId) {
    throw createError()
  }

  return normalizedUserId
}

export function requireRealtimeDatabase(
  database: Database | null,
  createError: CollectionErrorFactory,
): Database {
  if (!database) {
    throw createError()
  }

  return database
}

export function userCollectionPath(
  userId: string,
  collectionName: 'favourites' | 'watchlist',
  itemId?: string,
): string {
  const basePath = `users/${userId}/${collectionName}`
  return itemId ? `${basePath}/${itemId}` : basePath
}
