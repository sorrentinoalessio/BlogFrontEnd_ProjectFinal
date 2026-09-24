import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { VscCommentDiscussion } from "react-icons/vsc";
import { toast } from "react-toastify";
import { getPostPublic } from "../../services/postPublic.service";
import { useSocketEmit } from "../../../socket/useSocketEmit";
import styles from "./PostPublicList.module.css";

const getLevelScore = (post) => {
  const profileCandidates = [
    post.user,
    post.user?.user,
    post.user?.data,
    post.userData,
    post.profile,
    post.data?.user,
    post.owner,
    post.author,
    post.post?.user,
    post,
  ].filter((candidate) => candidate && typeof candidate === "object");

  const value =
    profileCandidates.find((candidate) => candidate.levelScore !== undefined)?.levelScore ??
    post.levelScore ??
    post.level ??
    0;

  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPostImageUrl = (post) => {
  const image = post.imageUrl || post.imagePost || post.img;
  if (!image) return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80";
  if (/^(https?:\/\/|data:|blob:)/i.test(image)) return image;
  return `${import.meta.env.VITE_API_URL}/${String(image).replace(/^\/+/, "")}`;
};

export default function PublicPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollMap, setenrollMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [loadingAction, setLoadingAction] = useState({});
  const [editingComment, setEditingComment] = useState({}); // { [commentId]: string }
  const [activeTab, setActiveTab] = useState("all");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchText, setSearchText] = useState("");

  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const { enrollPost, addComment, deleteComment } = useSocketEmit();

  // ── Carica i post ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPostPublic();

        console.log("RISPOSTA getPostPublic:", data);
        console.log("È un array?", Array.isArray(data));

        setPosts(data);

        const initialenroll = {};

        data.forEach((p) => {
          initialenroll[p._id] = {
            enroll: Array.isArray(p.enroll) ? p.enroll : [],
            enrollCount:
              p.enrollCount ??
              (Array.isArray(p.enroll) ? p.enroll.length : 0),
          };
        });

        setenrollMap(initialenroll);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") fetchPosts();
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  // ── Helper: utente ha già messo enroll? ─────────────────────────────────────
  const hasenrolld = useCallback(
    (postId) => {
      if (!user?.userId) return false;
      const entry = enrollMap[postId];
      if (!entry) return false;
      return entry.enroll.some((id) => id?.toString() === user.userId);
    },
    [enrollMap, user]
  );

  // ── enroll toggle ────────────────────────────────────────────────────────────
  const handleenroll = async (postId) => {
    if (!user?.accessToken) {
      toast.info("Accedi per partecipare all'attività");
      navigate("/login");
      return;
    }
    setLoadingAction((prev) => ({ ...prev, [postId]: "enroll" }));
    const currentEntry = enrollMap[postId] ?? { enroll: [], enrollCount: 0 };
    const currentEnroll = Array.isArray(currentEntry.enroll) ? currentEntry.enroll : [];
    const alreadyEnrolled = currentEnroll.some((enrollId) => enrollId?.toString() === user.userId);
    const optimisticEnroll = alreadyEnrolled
      ? currentEnroll.filter((enrollId) => enrollId?.toString() !== user.userId)
      : [...currentEnroll, user.userId];

    setenrollMap((prev) => ({
      ...prev,
      [postId]: { enroll: optimisticEnroll, enrollCount: optimisticEnroll.length },
    }));

    try {
      const data = await enrollPost(postId);
      if (Array.isArray(data?.enroll)) {
        setenrollMap((prev) => ({
          ...prev,
          [postId]: {
            enroll: data.enroll,
            enrollCount: data.enrollCount ?? data.enroll.length,
          },
        }));
      }
    } catch (err) {
      setenrollMap((prev) => ({ ...prev, [postId]: currentEntry }));
      toast.error(err?.message || "Non è stato possibile partecipare all'attività");
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

  const openPost = (postId, event, post) => {
    if (event.target.closest("button, textarea, input, select, a")) return;
    const enrollData = enrollMap[postId] ?? { enroll: [], enrollCount: 0 };
    navigate(`/user/post/${postId}`, {
      state: {
        post: {
          ...post,
          enroll: enrollData.enroll,
          enrollCount: enrollData.enrollCount,
        },
      },
    });
  };

  const visiblePosts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase("it-IT");
    const filteredPosts = normalizedSearch
      ? posts.filter((post) => {
        const searchableText = [
          post.title,
          post.description,
          post.ownerName,
          post.locality,
          ...(Array.isArray(post.tag) ? post.tag.map((tag) => typeof tag === "string" ? tag : tag?.tag) : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("it-IT");

        return searchableText.includes(normalizedSearch);
      })
      : posts;
    const sortedPosts = [...filteredPosts];

    if (activeTab === "recent") {
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          new Date(secondPost.creationDate || 0) -
          new Date(firstPost.creationDate || 0)
      );
    }

    if (activeTab === "enrolld") {
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          (enrollMap[secondPost._id]?.enrollCount ?? secondPost.enrollCount ?? secondPost.enroll?.length ?? 0) -
          (enrollMap[firstPost._id]?.enrollCount ?? firstPost.enrollCount ?? firstPost.enroll?.length ?? 0)
      );
    }

    if (activeTab === "level") {
      return sortedPosts.sort((firstPost, secondPost) => {
        const firstScore = getLevelScore(firstPost);
        const secondScore = getLevelScore(secondPost);
        return sortDirection === "asc"
          ? firstScore - secondScore
          : secondScore - firstScore;
      });
    }

    return sortedPosts;
  }, [activeTab, enrollMap, posts, searchText, sortDirection]);

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
      <div className={styles.searchBox} id="search">
        <label className={styles.searchLabel} htmlFor="post-search">Cerca un’attività</label>
        <div className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">⌕</span>
          <input
            id="post-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Cerca nel titolo, nella descrizione o nei tag"
            className={styles.searchInput}
          />
          {searchText && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Cancella ricerca"
              onClick={() => setSearchText("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Visualizzazione post">
        {[
          { value: "all", label: "Tutti" },
          { value: "recent", label: "Più recenti" },
          { value: "enrolld", label: "Più partecipati" },
          { value: "level", label: sortDirection === "asc" ? "Level ↑" : "Level ↓" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ""}`}
            onClick={() => {
              if (tab.value === "level") {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                setActiveTab("level");
                return;
              }

              setActiveTab(tab.value);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visiblePosts.length ? (
        <ul className={styles.list}>
          {visiblePosts.map((post) => {
            const postId = post._id;
            const enrollData = enrollMap[postId] ?? { enroll: [], enrollCount: 0 };
            const comments = commentsMap[postId] ?? post.comments ?? [];
            const isOpen = !!openComments[postId];
            const enrolld = hasenrolld(postId);
            const isEnrolling = loadingAction[postId] === "enroll";
            const isCommenting = loadingAction[postId] === "comment";
            const levelScore = getLevelScore(post);

            return (
              <li
                key={postId}
                className={styles.card}
                onClick={(event) => openPost(postId, event, post)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openPost(postId, event, post);
                  }
                }}
                role="link"
                tabIndex={0}
              >
                <div className={styles.cardImageWrap}>
                  <img
                    className={styles.cardImage}
                    src={getPostImageUrl(post)}
                    alt={post.title }
                  />
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.description}>
                    <h3>Luogo dell' attività:</h3>
                    <span>{post.title || "Vimercate (presenziale)"}</span>
                  </div>
                 
                  <div className={styles.levelRow}>
                    <span className={styles.levelLabel}>Level score</span>
                    <strong className={styles.levelValue}>{levelScore}</strong>
                  </div>
                  <p>Creata da:</p><h2 className={styles.title}>{post.ownerName || "Calogero"}</h2>

                </div>

                {/* ── Azioni ── */}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.participateBtn} ${enrolld ? styles.participating : ""}`}
                    onClick={() => handleenroll(postId)}
                    disabled={isEnrolling}
                  >
                    {enrolld ? "Partecipi" : "Partecipa"} ({enrollData.enrollCount})
                  </button>

                  <span className={styles.commentsBtn} aria-label={`Commenti: ${comments.length}`}>
                    <VscCommentDiscussion className={styles.commentIcon} />
                    <span>{comments.length}</span>
                  </span>

                  {post.locality && (
                    <a
                      className={styles.locationBtn}
                      href={post.locality}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      📍 Posizione
                    </a>
                  )}
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
                          console.log("isOwn:", isOwn);
                          const isEditing = editingComment[c._id] !== undefined;

                          return (
                            <li key={c._id ?? i} className={styles.commentItem}>
                              <div className={styles.commentBody}>
                                <strong className={styles.commentAuthor}>
                                  {c.authorName ?? c.author?.name ?? "Utente"}
                                </strong>
                                <span className={styles.commentDate}>
                                  {c.createdAt
                                    ? new Date(c.createdAt).toLocaleDateString("it-IT", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                    : "data non disponibile"}
                                </span>

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
                                        <p className="{styles.deleteCommentBtn}">elimina</p>
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
      ) : (
        <div className={styles.status}>
          <p>Nessun post corrisponde alla ricerca.</p>
        </div>
      )}
    </section>
  );
}
