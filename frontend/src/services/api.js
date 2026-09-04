import axios from "axios";
import socket from "../socket";

const apiUrl =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
  "https://mern-social-backend-hl8v.onrender.com/api";

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      socket.disconnect();
      socket.auth = {};
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
