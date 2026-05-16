import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiError(error) {
  if (!error.response) {
    return "Backend server is not running or cannot be reached.";
  }

  const detail = error.response.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.detail).filter(Boolean).join(", ");
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (error.response.status === 401) {
    return "Your session is missing or expired. Please login again.";
  }
  if (error.response.status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (error.response.status === 404) {
    return "Requested record was not found.";
  }
  return "Something went wrong. Please try again.";
}

export default api;
