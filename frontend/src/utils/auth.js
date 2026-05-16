export function getToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function canCreateTasks(user) {
  return user?.role === "admin" || user?.role === "manager";
}

export function canAssignTasks(user) {
  return user?.role === "admin" || user?.role === "manager";
}

export function canDeleteTasks(user) {
  return user?.role === "admin" || user?.role === "manager";
}
