export const editPost = async (id, postData, token) => {
  if (!token) throw new Error("Utente non autenticato");

  const response = await fetch(`${import.meta.env.VITE_API_URL}/user/post/update/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
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