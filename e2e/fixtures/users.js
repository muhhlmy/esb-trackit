function readTestCredential(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} wajib diisi melalui .env.e2e untuk menjalankan E2E.`)
  return value
}

export const TEST_USERS = {
  superadmin: {
    email: readTestCredential('E2E_SUPERADMIN_EMAIL'),
    password: readTestCredential('E2E_SUPERADMIN_PASSWORD'),
    role: "superadmin",
    name: "Super Admin",
  },
  admin: {
    email: readTestCredential('E2E_ADMIN_EMAIL'),
    password: readTestCredential('E2E_ADMIN_PASSWORD'),
    role: "admin",
    name: "Admin IT",
  },
  user: {
    email: readTestCredential('E2E_USER_EMAIL'),
    password: readTestCredential('E2E_USER_PASSWORD'),
    role: "user",
    name: "User Karyawan",
  },
};
