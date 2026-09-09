// Compatibility entrypoint: application startup must never mutate schema.
import { pool } from './database.js'
import { verifyRuntimeSchema } from './runtimeSchema.js'

export async function bootstrapSchema() {
  return verifyRuntimeSchema(pool)
}
