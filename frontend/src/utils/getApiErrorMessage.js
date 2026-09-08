function formatRetryAfter(value) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
    return `${Math.ceil(seconds / 60)} minutes`;
  }

  const retryDate = new Date(value);
  const remainingSeconds = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;
  if (remainingSeconds < 60) return `${remainingSeconds} seconds`;
  return `${Math.ceil(remainingSeconds / 60)} minutes`;
}

export default function getApiErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || fallback;

  if (error?.response?.status !== 429) return message;

  const retryAfter = formatRetryAfter(error.response.headers?.["retry-after"]);
  if (!retryAfter || message.toLowerCase().includes(retryAfter.toLowerCase())) {
    return message;
  }

  return `${message} Try again in ${retryAfter}.`;
}
