const isDevelopment = import.meta.env.DEV;

function getSafeError(error) {
  const status = error?.response?.status;
  const responseMessage = error?.response?.data?.message;

  return {
    ...(typeof status === "number" ? { status } : {}),
    ...(typeof responseMessage === "string"
      ? { message: responseMessage }
      : {}),
  };
}

function logError(operation, error) {
  if (!isDevelopment) return;
  console.error(operation, getSafeError(error));
}

function logWarning(message) {
  if (!isDevelopment) return;
  console.warn(message);
}

export default { error: logError, warn: logWarning };
