export const getPostDetails = async (id,accessToken) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 secondi

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/user/post/${id}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`, // Assicurati di avere accessToken disponibile nel contesto
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
  const message =
    typeof data === "object"
      ? data.message
      : response.status === 502 || response.status === 503
        ? " Server down"
        : `Errore HTTP: ${response.status}`;
  throw new Error(message);
}

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Richiesta scaduta: il server non ha risposto in tempo.");
    }
    throw error; // rilancia gli altri errori al chiamante
  } finally {
    clearTimeout(timeoutId); // pulizia sempre, anche se va a buon fine
  }
};