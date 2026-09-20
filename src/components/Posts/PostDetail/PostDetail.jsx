import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSocketEmit } from "../../../socket/useSocketEmit";
import sharedStyles from "../PostPublicList/PostPublicList.module.css";
import detailStyles from "./PostDetail.module.css";
import { getPostDetails } from "../../services/postDetails.service.js";
import { getPostPublic } from "../../services/postPublic.service.js";
import { toast } from "react-toastify";

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

const resolvePostImage = (post) => {
    const value = post.imagePost || post.imageUrl || post.img || "";
    if (!value) return "";
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;
    return `${import.meta.env.VITE_API_URL}/${value.replace(/^\/+/, "")}`;
};

const getMapEmbedUrl = (locality) => {
    if (!locality) return "";
    const value = String(locality);
    const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
        || value.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?)[,%20]+(-?\d+(?:\.\d+)?)/);
    if (!match) return "";

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    const delta = 0.025;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}&layer=mapnik&marker=${latitude},${longitude}`;
};

export default function PostDetail() {
    const { id } = useParams(); // legge :id da /user/post/:id
    const location = useLocation();
    const [posts, setPosts] = useState([]); // se vuoi tenere il map esistente
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enrollMap, setenrollMap] = useState({});
    const [commentsMap, setCommentsMap] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [commentText, setCommentText] = useState({});
    const [loadingAction, setLoadingAction] = useState({});
    const [editingComment, setEditingComment] = useState({}); // { [commentId]: string }

    const user = useSelector((state) => state.user);
    const { enrollPost, addComment, deleteComment } = useSocketEmit();

    // ── Carica i post ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return; // guard: evita fetch con id mancante

        const fetchPosts = async () => {
            try {
                const data = user?.accessToken
                    ? await getPostDetails(id, user.accessToken)
                    : (await getPostPublic()).find((post) => String(post._id) === String(id));
                if (!data) throw new Error("Post pubblico non trovato");
                const postArray = (Array.isArray(data) ? data : [data]).map((post) => {
                    const navigationPost = location.state?.post;
                    if (!navigationPost || String(navigationPost._id) !== String(post._id)) return post;

                    return {
                        ...post,
                        enroll: navigationPost.enroll ?? post.enroll,
                        enrollCount: navigationPost.enrollCount ?? post.enrollCount,
                    };
                }); // mantiene subito il conteggio aggiornato dalla lista pubblica
                setPosts(postArray);
                const initialenroll = {};
                const initialComments = {};
                postArray.forEach((p) => {
                    initialenroll[p._id] = {
                        enroll: Array.isArray(p.enroll) ? p.enroll : [],
                        enrollCount: p.enrollCount ?? (Array.isArray(p.enroll) ? p.enroll.length : 0),
                    };
                    initialComments[p._id] = Array.isArray(p.comments) ? p.comments : [];
                });
                setenrollMap(initialenroll);
                setCommentsMap(initialComments);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [id, user?.accessToken]);

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
            const data = await Promise.race([
                enrollPost(postId),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Il server non ha risposto. Riprova.")), 8000);
                }),
            ]);
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

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className={sharedStyles.status}>
                <span className={sharedStyles.spinner} />
                <p>Caricamento post...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${sharedStyles.status} ${sharedStyles.statusError}`}>
                <p>Errore: {error}</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className={sharedStyles.status}>
                <p>Nessun post disponibile.</p>
            </div>
        );
    }

    return (
        <section className={sharedStyles.singlePostPage}>
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
                    <article key={postId} className={sharedStyles.singlePostLayout}>
                        <div className={sharedStyles.mainContent}>
                            <div className={sharedStyles.categoryTag}>Attività</div>

                            <h1 className={sharedStyles.heroTitle}>{post.title || "Attività senza titolo"}</h1>

                            {resolvePostImage(post) && (
                                <img
                                    className={sharedStyles.detailPostImage}
                                    src={resolvePostImage(post)}
                                    alt={post.title || "Immagine del post"}
                                />
                            )}

                            <div className={sharedStyles.detailDescription}>
                                <h2>Descrizione</h2>
                                <p>{post.description || "Nessuna descrizione disponibile."}</p>
                            </div>

                            <div className={sharedStyles.badgeCard}>
                                <span className={sharedStyles.badgeIcon}>✦</span>
                                <div>
                                    <strong>Luogo dell’attività</strong>
                                    {post.locality ? (
                                        <a className={sharedStyles.mapPreview} href={post.locality} target="_blank" rel="noreferrer">
                                            <iframe
                                                title="Anteprima del luogo"
                                                src={getMapEmbedUrl(post.locality)}
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                            
                                        </a>
                                        
                                    ) : (
                                        <p>Luogo non specificato.</p>
                                    )}
                                    
                                </div>
                                
                            </div>

                            <button
                                type="button"
                                className={`${sharedStyles.participateBtn} ${hasenrolld(postId) ? sharedStyles.participating : ""}`}
                                onClick={() => handleenroll(postId)}
                                disabled={loadingAction[postId] === "enroll"}
                            >
                                {loadingAction[postId] === "enroll"
                                    ? "Attendo..."
                                    : hasenrolld(postId)
                                        ? `Partecipi (${enrollMap[postId]?.enrollCount ?? 0})`
                                        : `Partecipa (${enrollMap[postId]?.enrollCount ?? 0})`}
                            </button>

                           

                            <div className={sharedStyles.commentsSection}>
                                <div className={sharedStyles.commentsHeader}>
                                    <h3>Commenti</h3>
                                </div>

                                {comments.length ? (
                                    <ul className={sharedStyles.commentsList}>
                                        {comments.map((c, i) => {
                                            const isOwn = user?.userId && c.ownerId?.toString() === user.userId;
                                            const isEditing = editingComment[c._id] !== undefined;

                                            return (
                                                <li key={c._id ?? i} className={sharedStyles.commentItem}>
                                                    <div className={sharedStyles.commentHeader}>
                                                        <div className={sharedStyles.commentUser}>
                                                            <span className={sharedStyles.avatar}>{(c.authorName ?? c.author?.name ?? "U").charAt(0).toUpperCase()}</span>
                                                            <span className={sharedStyles.commentAuthor}>{c.authorName ?? c.author?.name ?? "Utente"}</span>
                                                        </div>
                                                        <span className={sharedStyles.commentStars}>★ 5</span>
                                                    </div>

                                                    {isEditing ? (
                                                        <input
                                                            className={sharedStyles.commentInput}
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
                                                        <p className={sharedStyles.commentText}>{c.comment ?? c.text ?? c.content}</p>
                                                    )}

                                                    {isOwn && (
                                                        <div className={sharedStyles.commentActions}>
                                                            {isEditing ? (
                                                                <>
                                                                    <button type="button" className={sharedStyles.saveCommentBtn} onClick={() => handleEditComment(postId, c._id, c.comment ?? c.text)}>✅</button>
                                                                    <button type="button" className={sharedStyles.cancelCommentBtn} onClick={() => setEditingComment((prev) => { const s = { ...prev }; delete s[c._id]; return s; })}>❌</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button type="button" className={sharedStyles.editCommentBtn} onClick={() => setEditingComment((prev) => ({ ...prev, [c._id]: c.comment ?? c.text ?? "" }))}>✏️</button>
                                                                    <button type="button" className={sharedStyles.deleteCommentBtn} onClick={() => handleDeleteComment(postId, c._id)}>Elimina</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className={sharedStyles.emptyComments}>Nessun commento ancora.</div>
                                )}

                                {user?.accessToken ? (
                                    <div className={sharedStyles.addComment}>
                                        <textarea
                                            className={sharedStyles.commentInput}
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
                                            className={sharedStyles.sendBtn}
                                            onClick={() => handleAddComment(postId)}
                                            disabled={isCommenting || !(commentText[postId] ?? "").trim()}
                                        >
                                            {isCommenting ? "..." : "Invia"}
                                        </button>
                                    </div>
                                ) : (
                                    <p className={sharedStyles.loginHint}>Accedi per commentare.</p>
                                )}
                            </div>
                        </div>

                        <aside className={detailStyles.sidePanel}>
                            <div className={detailStyles.sideCard}>
                                <div className={sharedStyles.sideHeader}>
                                    <div className={sharedStyles.sideImageWrap}>
                                        <img
                                            src={
                                                resolveAvatarUrl(profile.avatar) ||
                                                post.imageUrl ||
                                                SWIMMING_AVATAR
                                            }
                                            alt={post.ownerName || profile.name }
                                            className={sharedStyles.sideImage}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = SWIMMING_AVATAR;
                                            }}
                                        />
                                    </div>
                                </div>

                                <h2 className={sharedStyles.sideName}><h6>Creato da:</h6>{post.ownerName || profile.name || "No name"}</h2>
                                <div className={sharedStyles.sideStats}>
                                    <div className={sharedStyles.sideRow}>
                                        <span>Level score</span>
                                        <strong>{levelScore}</strong>
                                    </div>
                                    <div className={sharedStyles.sideRow}>
                                        <span>Tempo nei 100 metri</span>
                                        <strong>{timeForHundredMeters}</strong>
                                    </div>
                                    <div className={sharedStyles.sideRow}>
                                        <span>Post pubblicati</span>
                                        <strong>{publicPostsCount}</strong>
                                    </div>
                                </div>
                              
                            </div>
                        </aside>
                    </article>
                );
            })}
        </section>
    );
}
