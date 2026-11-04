import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'

const pool = mysql.createPool(process.env.DATABASE_URL ?? 'mysql://monitoring:monitoring@localhost:3306/monitoring_digit')
export const db = drizzle(pool)
export { pool }
