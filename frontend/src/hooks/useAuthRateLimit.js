import { useCallback, useEffect, useState } from "react";
import { getAuthRateLimitStatus } from "../services/authService";
import logger from "../utils/logger";

export default function useAuthRateLimit(action) {
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const response = await getAuthRateLimitStatus(action);
      setStatus(response.data);
      return response.data;
    } catch (error) {
      logger.error(`auth.${action}_rate_limit_status.failed`, error);
      return null;
    }
  }, [action]);

  const syncFromError = useCallback((error) => {
    const metadata = error?.response?.data?.rateLimit;
    if (metadata) setStatus(metadata);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status?.resetAt) return;

    const delay = new Date(status.resetAt).getTime() - Date.now();
    if (delay <= 0) {
      refresh();
      return;
    }

    const timeout = setTimeout(refresh, delay + 100);
    return () => clearTimeout(timeout);
  }, [status?.resetAt, refresh]);

  return { status, refresh, syncFromError };
}
