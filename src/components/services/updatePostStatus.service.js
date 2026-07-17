export const updatePostStatus = async (postId, payload) => {
  const tokenRaw = localStorage.getItem("token");
  const token = tokenRaw?.replace(/^['"]|['"]$/g, "");

  if (!token) throw new Error("Utente non autenticato");

  const response = await fetch(
    `http://127.0.0.1:3001/user/post/update/${postId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload), // es: { status: "public" }
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