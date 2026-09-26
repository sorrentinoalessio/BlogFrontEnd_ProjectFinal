// data/orario dell'appuntamento mostrati nelle card, con fallback alla data di creazione
const getPostTimestamp = (post) => post.eventDate || post.appointmentDate || post.creationDate || "";

export const formatPostDate = (post) => {
  const value = getPostTimestamp(post);
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT");
};

// l'orario compare solo se è stato effettivamente impostato (diverso da mezzanotte)
export const formatPostTime = (post) => {
  const value = getPostTimestamp(post);
  if (!value) return "";
  const date = new Date(value);
  if (date.getHours() === 0 && date.getMinutes() === 0) return "";
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};
