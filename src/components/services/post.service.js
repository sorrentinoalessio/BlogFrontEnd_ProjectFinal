export const getPost = async (token) => {
  const cleanToken = token?.replace(/^['"]|['"]$/g, "");

  const response = await fetch("http://127.0.0.1:3001/user/post/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanToken}`,
    },
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

export const updatePostStatus = async (postId, payload, token) => {
  const cleanToken = token?.replace(/^['"]|['"]$/g, "");
  if (!cleanToken) throw new Error("Utente non autenticato");

  const response = await fetch(
    `http://127.0.0.1:3001/user/post/update/${postId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(payload),
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