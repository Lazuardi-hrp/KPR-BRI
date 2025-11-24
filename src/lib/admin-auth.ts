// Simple authentication utility using localStorage
export const DEFAULT_ADMIN_PASSWORD = "admin123"

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("adminLogged") === "true"
}

export function loginAdmin(password: string): boolean {
  if (password === DEFAULT_ADMIN_PASSWORD) {
    localStorage.setItem("adminLogged", "true")
    return true
  }
  return false
}

export function logoutAdmin(): void {
  localStorage.removeItem("adminLogged")
}