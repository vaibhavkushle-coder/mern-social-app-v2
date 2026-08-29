export function isValidJwt(token) {
  const parts = token?.split(".");

  if (parts?.length !== 3) {
    return false;
  }

  try {
    const encodedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      atob(
        encodedPayload.padEnd(
          encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
          "=",
        ),
      ),
    );

    return typeof payload.exp === "number" && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
