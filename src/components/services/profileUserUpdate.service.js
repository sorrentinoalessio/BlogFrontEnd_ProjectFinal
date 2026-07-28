export const profileUserUpdate = async (token, payload) => {
  const cleanToken = token?.replace(/^['"]|['"]$/g, "");
  if (!cleanToken) throw new Error("Utente non autenticato");

  const isFormData = payload instanceof FormData;
  const response = await fetch(
    `http://127.0.0.1:3001/user/profile/update`,
    {
      method: "PATCH",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${cleanToken}`,
      },
      body: isFormData ? payload : JSON.stringify(payload),
    }
  );

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : data.message || `Errore HTTP: ${response.status}`;
    throw new Error(message);
  }

  return data;
};