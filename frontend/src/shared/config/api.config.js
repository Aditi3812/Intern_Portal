/**
 * Centralized API configuration.
 *
 * Resolves the backend base endpoint from Vite's environment variables,
 * falling back to the current page origin when `VITE_API_URL` is unset so
 * the app always stays local without any hardcoded host.
 *
 * All service modules (auth, admin, analytics, intern, teamleader,
 * notification, verify, ...) import from here so the base URL is defined
 * in a single place and never hardcoded across the codebase.
 */
import axios from 'axios';

/**
 * Resolved backend API base URL.
 *
 * @type {string}
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Shared default axios request headers.
 *
 * @type {object}
 */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * Create a pre-configured axios instance bound to the shared base URL.
 *
 * @param {object} [options] Optional per-instance overrides (e.g. baseURL, headers)
 * @returns {import('axios').AxiosInstance}
 */
export const createApiClient = (options = {}) => {
  const { baseURL = API_BASE_URL, headers = {}, ...rest } = options;

  return axios.create({
    baseURL,
    headers: { ...DEFAULT_HEADERS, ...headers },
    withCredentials: true,
    ...rest,
  });
};