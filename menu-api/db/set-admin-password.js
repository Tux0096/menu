/**
 * Пароль администратора из секрета GitHub ADMIN_PASSWORD (передаёт деплой).
 * Ставит пароль пользователю admin (создаёт его, если нет) и включает учётку. Пароль не печатается.
 */
import dotenv from 'dotenv';
dotenv.config();
import pool from './pool.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';

// При вставке в секрет GitHub часто попадает перенос строки или пробел в конце — их не должно быть в пароле
const raw = process.env.ADMIN_PASSWORD_RESET || '';
const password = raw.trim();
if (password !== raw) console.log('  в секрете ADMIN_PASSWORD были пробелы или перенос строки по краям — убраны');
if (password.length < 6) {
  console.log('  пароль администратора: секрет ADMIN_PASSWORD короче 6 символов — не меняю');
  process.exit(0);
}
const { rows } = await pool.query("SELECT id, password_hash FROM staff_users WHERE login = 'admin'");
if (!rows[0]) {
  await pool.query(
    "INSERT INTO staff_users (login, name, role, password_hash) VALUES ('admin', 'Администратор', 'admin', $1)",
    [hashPassword(password)],
  );
  console.log('  администратор admin создан с паролем из секрета ADMIN_PASSWORD');
} else if (!verifyPassword(password, rows[0].password_hash)) {
  await pool.query(
    "UPDATE staff_users SET password_hash = $2, role = 'admin', is_active = TRUE WHERE id = $1",
    [rows[0].id, hashPassword(password)],
  );
  console.log('  пароль администратора admin обновлён из секрета ADMIN_PASSWORD');
} else {
  console.log('  пароль администратора admin совпадает с секретом ADMIN_PASSWORD');
}
await pool.end();
