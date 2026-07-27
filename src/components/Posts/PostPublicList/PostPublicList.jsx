import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { getPostPublic } from "../../services/postPublic.service";
import { useSocketEmit } from "../../../socket/useSocketEmit";
import styles from "./PostPublicList.module.css";

export default function PublicPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [loadingAction, setLoadingAction] = useState({});
  const [editingComment, setEditingComment] = useState({}); // { [commentId]: string }

  const user = useSelector((state) => state.user);
  const { likePost, addComment, deleteComment } = useSocketEmit();

  // ── Carica i post ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPostPublic();
        setPosts(data);
        const initialLikes = {};
        data.forEach((p) => {
          initialLikes[p._id] = {
            likes: Array.isArray(p.likes) ? p.likes : [],
            likesCount: p.likesCount ?? (Array.isArray(p.likes) ? p.likes.length : 0),
          };
        });
        setLikesMap(initialLikes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // ── Helper: utente ha già messo like? ─────────────────────────────────────
  const hasLiked = useCallback(
    (postId) => {
      if (!user?.userId) return false;
      const entry = likesMap[postId];
      if (!entry) return false;
      return entry.likes.some((id) => id?.toString() === user.userId);
    },
    [likesMap, user]
  );

  // ── Like toggle ────────────────────────────────────────────────────────────
  const handleLike = async (postId) => {
    if (!user?.accessToken) return;
    setLoadingAction((prev) => ({ ...prev, [postId]: "like" }));
    try {
      const data = await likePost(postId);
      setLikesMap((prev) => ({
        ...prev,
        [postId]: {
          likes: data.likes ?? [],
          likesCount: data.likesCount ?? 0,
        },
      }));
    } catch (err) {
      console.error("Errore like:", err.message);
    } finally {
      setLoadingAction((prev) => ({ ...prev, [postId]: null }));
    }
  };

  // ── Aggiungi commento ──────────────────────────────────────────────────────
  const handleAddComment = async (postId) => {
    const text = (commentText[postId] ?? "").trim();
    if (!text || !user?.accessToken) return;
    setLoadingAction((prev) => ({ ...prev, [postId]: "comment" }));
    try {
      const newComment = await addComment(postId, text);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [{ ...newComment, authorName: user.name }, ...(prev[postId] ?? [])],
      }));
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Errore commento:", err.message);
    } finally {
      setLoadingAction((prev) => ({ ...prev, [postId]: null }));
    }
  };

  // ── Modifica commento (delete + add) ──────────────────────────────────────
  const handleEditComment = async (postId, commentId, originalText) => {
    const newText = (editingComment[commentId] ?? originalText).trim();
    // se il testo non è cambiato, chiudi solo la modalità edit
    if (!newText || newText === originalText) {
      setEditingComment((prev) => {
        const s = { ...prev };
        delete s[commentId];
        return s;
      });
      return;
    }
    try {
      await deleteComment(commentId);
      const newComment = await addComment(postId, newText);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [
          { ...newComment, authorName: user.name },
          ...(prev[postId] ?? []).filter((c) => c._id !== commentId),
        ],
      }));
    } catch (err) {
      console.error("Errore modifica commento:", err.message);
    } finally {
      setEditingComment((prev) => {
        const s = { ...prev };
        delete s[commentId];
        return s;
      });
    }
  };

  // ── Elimina commento ──────────────────────────────────────────────────────
  const handleDeleteComment = async (postId, commentId) => {
    if (!user?.accessToken) return;
    try {
      await deleteComment(commentId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c._id !== commentId),
      }));
    } catch (err) {
      console.error("Errore eliminazione commento:", err.message);
    }
  };

  // ── Toggle pannello commenti ───────────────────────────────────────────────
  const toggleComments = (postId, postComments) => {
    setOpenComments((prev) => {
      const willOpen = !prev[postId];
      if (willOpen && !commentsMap[postId]) {
        setCommentsMap((cm) => ({ ...cm, [postId]: postComments ?? [] }));
      }
      return { ...prev, [postId]: willOpen };
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.status}>
        <span className={styles.spinner} />
        <p>Caricamento post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.status} ${styles.statusError}`}>
        <p>Errore: {error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.status}>
        <p>Nessun post disponibile.</p>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <ul className={styles.list}>
        {posts.map((post) => {
          const postId = post._id;
          const likeData = likesMap[postId] ?? { likes: [], likesCount: 0 };
          const comments = commentsMap[postId] ?? post.comments ?? [];
          const isOpen = !!openComments[postId];
          const liked = hasLiked(postId);
          const isLiking = loadingAction[postId] === "like";
          const isCommenting = loadingAction[postId] === "comment";

          return (
            <li key={postId} className={styles.card} >

              <p className={styles.name}>Titolo post: </p><h3 className={styles.title}>{post.title}</h3>
              <p className={styles.name}>Descrizione post: </p><p className={styles.description}>{post.description}</p>

              <div className={styles.meta}>
                <span>
                  Pubblicato il:{" "}
                  {post.creationDate
                    ? new Date(post.creationDate).toLocaleDateString("it-IT")
                    : "-"}
                </span>
              </div>

              <div className={styles.tags}>
                {(post.tag ?? []).length > 0 ? (
                  (post.tag ?? []).map((t) => (
                    <span key={t._id} className={styles.tag}>
                      #{t.tag}
                    </span>
                  ))
                ) : (
                  <span className={styles.noTags}>Nessun tag</span>
                )}
              </div>

              <div className={styles.author}>
                <span>Creato da: {post.ownerName ?? "—"}</span>
              </div>

              {/* ── Azioni ── */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
                  onClick={() => handleLike(postId)}
                  disabled={!user?.accessToken || isLiking}
                  title={
                    user?.accessToken
                      ? liked ? "Rimuovi like" : "Metti like"
                      : "Accedi per mettere like"
                  }
                >
                  {liked ? "❤️" : "🤍"} {likeData.likesCount}
                </button>

                <button
                  type="button"
                  className={styles.commentsBtn}
                  onClick={() => toggleComments(postId, post.comments)}
                >
                  {isOpen ? "Nascondi commenti" : `💬 Commenti (${comments.length})`}
                </button>
              </div>

              {/* ── Pannello commenti ── */}
              {isOpen && (
                <div className={styles.commentsPanel}>
                  {/* Form aggiunta commento */}
                  {user?.accessToken ? (
                    <div className={styles.addComment}>
                      <textarea
                        className={styles.commentInput}
                        placeholder="Scrivi un commento..."
                        rows={1}
                        value={commentText[postId] ?? ""}
                        onChange={(e) => {
                          setCommentText((prev) => ({ ...prev, [postId]: e.target.value }));
                        }}
                        onInput={(e) => {
                          // Si attiva a ogni inserimento di testo o riga vuota, regolando l'altezza
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                      />
                      <button
                        type="button"
                        className={styles.sendBtn}
                        onClick={(e) => {
                          handleAddComment(postId);
                          // Trova la textarea e resetta la sua altezza dopo l'invio
                          const textarea = e.currentTarget.previousElementSibling;
                          if (textarea) textarea.style.height = "auto";
                        }}
                        disabled={isCommenting || !(commentText[postId] ?? "").trim()}
                      >
                        {isCommenting ? "..." : "Invia"}
                      </button>
                    </div>



                  ) : (
                    <p className={styles.loginHint}>Accedi per commentare.</p>
                  )}

                  {/* Lista commenti */}
                  <ul className={styles.commentsList}>
                    {comments.length ? (
                      comments.map((c, i) => {
                        const isOwn =
                          user?.userId && c.ownerId?.toString() === user.userId;
                        const isEditing = editingComment[c._id] !== undefined;

                        return (
                          <li key={c._id ?? i} className={styles.commentItem}>
                            <div className={styles.commentBody}>
                              <strong className={styles.commentAuthor}>
                                {c.authorName ?? c.author?.name ?? "Utente"}
                              </strong>

                              {/* testo o input di modifica */}
                              {isEditing ? (
                                <input
                                  className={styles.commentInput}
                                  value={editingComment[c._id]}
                                  onChange={(e) =>
                                    setEditingComment((prev) => ({
                                      ...prev,
                                      [c._id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleEditComment(postId, c._id, c.comment ?? c.text);
                                    if (e.key === "Escape")
                                      setEditingComment((prev) => {
                                        const s = { ...prev };
                                        delete s[c._id];
                                        return s;
                                      });
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className={styles.commentText}>
                                  {c.comment ?? c.text ?? c.content}
                                </span>
                              )}
                            </div>

                            {/* bottoni azione — solo per i propri commenti */}
                            {isOwn && (
                              <div className={styles.commentActions}>
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.saveCommentBtn}
                                      onClick={() =>
                                        handleEditComment(postId, c._id, c.comment ?? c.text)
                                      }
                                      title="Salva modifica"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.cancelCommentBtn}
                                      onClick={() =>
                                        setEditingComment((prev) => {
                                          const s = { ...prev };
                                          delete s[c._id];
                                          return s;
                                        })
                                      }
                                      title="Annulla"
                                    >
                                      ❌
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.editCommentBtn}
                                      onClick={() =>
                                        setEditingComment((prev) => ({
                                          ...prev,
                                          [c._id]: c.comment ?? c.text ?? "",
                                        }))
                                      }
                                      title="Modifica commento"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.deleteCommentBtn}
                                      onClick={() => handleDeleteComment(postId, c._id)}
                                      title="Elimina commento"
                                    >
                                      🗑
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })
                    ) : (
                      <li className={styles.commentItem}>Nessun commento ancora.</li>
                    )}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
