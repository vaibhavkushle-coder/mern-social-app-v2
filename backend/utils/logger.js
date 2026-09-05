const blockedContextKey = /token|authorization|password|secret|body|file|buffer/i;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getSafeContext(context) {
  if (!context || typeof context !== "object" || Buffer.isBuffer(context)) {
    return undefined;
  }

  const safeContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (blockedContextKey.test(key)) continue;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safeContext[key] = value;
    }
  }

  return Object.keys(safeContext).length > 0 ? safeContext : undefined;
}

function info(message, context) {
  const safeContext = getSafeContext(context);
  console.log(message, ...(safeContext ? [safeContext] : []));
}

function warn(message, context) {
  const safeContext = getSafeContext(context);
  console.warn(message, ...(safeContext ? [safeContext] : []));
}

function error(message, caughtError, context) {
  const safeContext = getSafeContext(context) || {};
  const status = caughtError?.statusCode || caughtError?.status;
  const errorDetails = {
    ...safeContext,
    ...(caughtError?.name ? { errorName: caughtError.name } : {}),
    ...(typeof status === "number" ? { status } : {}),
    ...(!isProduction() && caughtError?.message
      ? { errorMessage: caughtError.message }
      : {}),
    ...(!isProduction() && caughtError?.stack
      ? { stack: caughtError.stack }
      : {}),
  };

  console.error(message, errorDetails);
}

module.exports = { info, warn, error };
