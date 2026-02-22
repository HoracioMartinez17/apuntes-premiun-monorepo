export const APP_NAME = "Apuntes Premium";
export const APP_DESCRIPTION = "Apuntes Premium para Programadores";

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  APUNTES: "/apuntes",
  LOGIN: "/login",
  REGISTER: "/register",
  ADMIN: "/admin",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
  },
  USERS: "/users",
  APUNTES: "/apuntes",
} as const;
