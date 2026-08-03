export const uploadAvatar = async (token, file) => {
  const cleanToken = token?.replace(/^['"]|['"]$/g, "");
  if (!cleanToken) throw new Error("Utente non autenticato");

  const formData = new FormData();
  formData.append("uploadedFile", file);

  const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile/avatar/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
    },
    body: formData,
  });

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
