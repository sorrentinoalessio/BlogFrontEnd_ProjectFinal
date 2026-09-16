import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSocketEmit } from "../../../socket/useSocketEmit";
import styles from "../PostPublicList/PostPublicList.module.css";
import { getPostDetails } from "../../services/postDetails.service.js";
import { getPostPublic } from "../../services/postPublic.service.js";

const SWIMMING_AVATAR =
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=85";

const resolveAvatarUrl = (avatar) => {
    if (!avatar) return "";

    const value = typeof avatar === "string"
        ? avatar
        : avatar.avatar || avatar.avatarUrl || avatar.url || avatar.path || "";
    const trimmedValue = value.trim();

    if (!trimmedValue) return "";
    if (/^(https?:\/\/|data:|blob:)/i.test(trimmedValue)) return trimmedValue;

    const filename = trimmedValue.replace(/\\/g, "/").split("/").filter(Boolean).pop();
    return filename
        ? `${import.meta.env.VITE_API_URL}/uploads/${filename}?t=${Date.now()}`
        : "";
};

export default function PostDetail() {
    const { id } = useParams(); // legge :id da /user/post/:id
    const [posts, setPosts] = useState([]); // se vuoi tenere il map esistente
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
        if (!id) return; // guard: evita fetch con id mancante

        const fetchPosts = async () => {
            try {
                const data = user?.accessToken
                    ? await getPostDetails(id, user.accessToken)
                    : (await getPostPublic()).find((post) => String(post._id) === String(id));
                if (!data) throw new Error("Post pubblico non trovato");
                const postArray = Array.isArray(data) ? data : [data]; // normalizza a array
                setPosts(postArray);
                const initialLikes = {};
                const initialComments = {};
                postArray.forEach((p) => {
                    initialLikes[p._id] = {
                        likes: Array.isArray(p.likes) ? p.likes : [],
                        likesCount: p.likesCount ?? (Array.isArray(p.likes) ? p.likes.length : 0),
                    };
                    initialComments[p._id] = Array.isArray(p.comments) ? p.comments : [];
                });
                setLikesMap(initialLikes);
                setCommentsMap(initialComments);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [id, user?.accessToken]);

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
        <section className={styles.singlePostPage}>
            {posts.map((post) => {
                const postId = post._id;
                const comments = commentsMap[postId] ?? post.comments ?? [];
                const isCommenting = loadingAction[postId] === "comment";
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
                const profile = profileCandidates.find(
                    (candidate) => candidate.name !== undefined || candidate.avatar !== undefined
                ) ?? {};
                const levelScore =
                    profileCandidates.find((candidate) => candidate.levelScore !== undefined)?.levelScore ?? "-";
                const timeForHundredMeters =
                    profileCandidates.find((candidate) => candidate.timeForHundredMeters !== undefined)
                        ?.timeForHundredMeters ?? "-";
                const publicPostsCount =
                    post.publicPostsCount ??
                    profile.publicPostsCount ??
                    (Array.isArray(profile.posts)
                        ? profile.posts.filter((profilePost) => profilePost.status === "public").length
                        : "-");

                return (
                    <article key={postId} className={styles.singlePostLayout}>
                        <div className={styles.mainContent}>
                            <div className={styles.categoryTag}>Nuoto</div>

                            <h1 className={styles.heroTitle}>
                                {post.title || "Istruttore di nuoto, laureato Magistrale in \"Scienze e tecniche delle attività motorie preventive e adattate\" propone lezioni di nuoto a tutte le età e i livelli."}
                            </h1>

                            <div className={styles.locationBlock}>
                                <h2 className={styles.locationTitle}>Luogo del corso</h2>
                                <div className={styles.locationPills}>
                                    <span className={styles.locationPill}>📍 {post.location || "Presso Calogero: Vimercate"}</span>
                                    <span className={styles.locationPill}>🏊‍♂️ A casa tua : spostamento fino a 10 km da Vimercate</span>
                                </div>
                            </div>

                            <div className={styles.badgeCard}>
                                <span className={styles.badgeIcon}>✦</span>
                                <div>
                                    <strong>Ambasciatore</strong>
                                    <p>
                                        È il meglio del meglio degli insegnanti. Qualità del profilo, eccellenza del livello,
                                        risposta garantita. Calogero organizzerà con cura la tua prima lezione di Nuoto.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.bioSection}>
                                <h3>Riguardo Calogero</h3>
                                <p>
                                    {post.description ||
                                        "Ho conseguito la laurea Magistrale in \"Scienze e tecniche delle attività motorie preventive e adattate\" presso l'Università degli Studi di Milano ottenendo il massimo dei voti. Durante gli studi ho lavorato in qualità di docente nelle scuole secondarie di secondo grado. Ho svolto successivamente al mio percorso di studi, 6 mesi di tirocinio nel laboratorio di ricerca della mia Università per continuare la mia tesi sperimentale."}
                                </p>
                            </div>

                            <div className={styles.offerSection}>
                                <p className={styles.offerIntro}>Che tu sia un principiante assoluto, un adulto che vuole superare la paura dell'acqua o un semplice desiderio di migliorare la tua tecnica, offro lezioni personalizzate adatte al tuo livello e ai tuoi obiettivi.</p>

                                <div className={styles.offerListWrap}>
                                    <h4>Cosa offro:</h4>
                                    <ul className={styles.offerList}>
                                        <li>Lezioni individuali o in piccoli gruppi;</li>
                                        <li>Approccio progressivo e motivante;</li>
                                        <li>Tecniche efficaci per superare l'insicurezza in acqua;</li>
                                        <li>Allenamenti tecnici per migliorare stile e resistenza;</li>
                                        <li>Esperienza con tutte le età: bambini, ragazzi, adulti.</li>
                                    </ul>
                                </div>

                                <p className={styles.offerClosing}>Con passione, competenza e metodo, ti guiderò passo dopo passo nel tuo percorso in acqua.</p>
                            </div>

                            <div className={styles.commentsSection}>
                                <div className={styles.commentsHeader}>
                                    <h3>Commenti</h3>
                                    <span className={styles.commentsRating}>★ 5 (17 commenti)</span>
                                </div>

                                {comments.length ? (
                                    <ul className={styles.commentsList}>
                                        {comments.map((c, i) => {
                                            const isOwn = user?.userId && c.ownerId?.toString() === user.userId;
                                            const isEditing = editingComment[c._id] !== undefined;

                                            return (
                                                <li key={c._id ?? i} className={styles.commentItem}>
                                                    <div className={styles.commentHeader}>
                                                        <div className={styles.commentUser}>
                                                            <span className={styles.avatar}>{(c.authorName ?? c.author?.name ?? "U").charAt(0).toUpperCase()}</span>
                                                            <span className={styles.commentAuthor}>{c.authorName ?? c.author?.name ?? "Utente"}</span>
                                                        </div>
                                                        <span className={styles.commentStars}>★ 5</span>
                                                    </div>

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
                                                        <p className={styles.commentText}>{c.comment ?? c.text ?? c.content}</p>
                                                    )}

                                                    {isOwn && (
                                                        <div className={styles.commentActions}>
                                                            {isEditing ? (
                                                                <>
                                                                    <button type="button" className={styles.saveCommentBtn} onClick={() => handleEditComment(postId, c._id, c.comment ?? c.text)}>✅</button>
                                                                    <button type="button" className={styles.cancelCommentBtn} onClick={() => setEditingComment((prev) => { const s = { ...prev }; delete s[c._id]; return s; })}>❌</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button type="button" className={styles.editCommentBtn} onClick={() => setEditingComment((prev) => ({ ...prev, [c._id]: c.comment ?? c.text ?? "" }))}>✏️</button>
                                                                    <button type="button" className={styles.deleteCommentBtn} onClick={() => handleDeleteComment(postId, c._id)}>Elimina</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className={styles.emptyComments}>Nessun commento ancora.</div>
                                )}

                                {user?.accessToken ? (
                                    <div className={styles.addComment}>
                                        <textarea
                                            className={styles.commentInput}
                                            placeholder="Scrivi un commento..."
                                            rows={1}
                                            value={commentText[postId] ?? ""}
                                            onChange={(e) => setCommentText((prev) => ({ ...prev, [postId]: e.target.value }))}
                                            onInput={(e) => {
                                                e.target.style.height = "auto";
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className={styles.sendBtn}
                                            onClick={() => handleAddComment(postId)}
                                            disabled={isCommenting || !(commentText[postId] ?? "").trim()}
                                        >
                                            {isCommenting ? "..." : "Invia"}
                                        </button>
                                    </div>
                                ) : (
                                    <p className={styles.loginHint}>Accedi per commentare.</p>
                                )}
                            </div>
                        </div>

                        <aside className={styles.sidePanel}>
                            <div className={styles.sideCard}>
                                <div className={styles.sideHeader}>
                                    <div className={styles.sideImageWrap}>
                                        <img
                                            src={
                                                resolveAvatarUrl(profile.avatar) ||
                                                post.imageUrl ||
                                                SWIMMING_AVATAR
                                            }
                                            alt={post.ownerName || profile.name || "Instructor"}
                                            className={styles.sideImage}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = SWIMMING_AVATAR;
                                            }}
                                        />
                                        <button type="button" className={styles.sideFavorite} aria-label="Salva insegnante">♡</button>
                                    </div>
                                    <button type="button" className={styles.shareBtn} aria-label="Condividi">↗</button>
                                </div>

                                <h2 className={styles.sideName}>{post.ownerName || profile.name || "Calogero"}</h2>
                                <div className={styles.sideMeta}>
                                    <span className={styles.sideStar}>★</span>
                                    <span>5</span>
                                    <span className={styles.sideMetaText}>(17 commenti)</span>
                                </div>

                                <div className={styles.sideStats}>
                                    <div className={styles.sideRow}>
                                        <span>Level score</span>
                                        <strong>{levelScore}</strong>
                                    </div>
                                    <div className={styles.sideRow}>
                                        <span>Tempo 100 metri</span>
                                        <strong>{timeForHundredMeters}</strong>
                                    </div>
                                    <div className={styles.sideRow}>
                                        <span>Post pubblicati</span>
                                        <strong>{publicPostsCount}</strong>
                                    </div>
                                </div>

                                <button type="button" className={styles.contactBtn}>Contattare</button>
                            </div>
                        </aside>
                    </article>
                );
            })}
        </section>
    );
}
