import axios from "axios";


export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

export const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  API_BASE_URL.replace(/\/api$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const initialToken =
  typeof window !== "undefined" ? window.localStorage.getItem("dependguard_token") : null;

if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}


export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
