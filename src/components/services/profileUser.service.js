export const getProfile = async (token) => {
  const cleanToken = token?.replace(/^['"]|['"]$/g, "");

  const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile`, {
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