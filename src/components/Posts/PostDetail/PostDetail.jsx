import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSocketEmit } from "../../../socket/useSocketEmit";
import sharedStyles from "../PostPublicList/PostPublicList.module.css";
import detailStyles from "./PostDetail.module.css";
import { getPostDetails } from "../../services/postDetails.service.js";
import { getPostPublic } from "../../services/postPublic.service.js";
import { getWeatherForDate } from "../../services/weather.service.js";
import { toast } from "react-toastify";

const SWIMMING_AVATAR = "/default-avatar.svg";

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

const weatherLabels = {
    0: "Sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Nuvoloso",
    45: "Nebbia",
    48: "Nebbia con brina",
    51: "Pioviggine leggera",
    53: "Pioviggine",
    55: "Pioviggine intensa",
    61: "Pioggia leggera",
    63: "Pioggia",
    65: "Pioggia intensa",
    71: "Neve leggera",
    73: "Neve",
    75: "Neve intensa",
    80: "Rovesci leggeri",
    81: "Rovesci",
    82: "Rovesci intensi",
    95: "Temporale",
    96: "Temporale con grandine",
    99: "Temporale con grandine intensa",
};

const getWindDirectionLabel = (degrees) => {
    if (degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) return "-";
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return `${directions[Math.round(Number(degrees) / 45) % 8]} (${Math.round(Number(degrees))}°)`;
};

const parseWeather = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
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

const getPostCoordinates = (post) => {
    const latitude = Number(post.latitude ?? post.coordinates?.latitude ?? post.coordinates?.[0]);
    const longitude = Number(post.longitude ?? post.coordinates?.longitude ?? post.coordinates?.[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return [latitude, longitude];

    const locality = String(post.locality ?? post.location ?? "");
    const match = locality.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    return match ? [Number(match[1]), Number(match[2])] : null;
};

const getPostEventDate = (post) => post.eventDate || post.appointmentDate || post.creationDate || "";

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
                const hydratedPosts = await Promise.all(postArray.map(async (post) => {
                    if (parseWeather(post.weather)) return post;

                    const coordinates = getPostCoordinates(post);
                    const date = String(getPostEventDate(post)).slice(0, 10);
                    if (!coordinates || !date) return post;

                    try {
                        const weather = await getWeatherForDate({
                            latitude: coordinates[0],
                            longitude: coordinates[1],
                            date,
                        });
                        return { ...post, weather };
                    } catch {
                        return post;
                    }
                }));
                setPosts(hydratedPosts);
                const initialenroll = {};
                const initialComments = {};
                hydratedPosts.forEach((p) => {
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
                    const weather = parseWeather(post.weather);
                    const atmospheric = weather?.atmospheric;
                    const marine = weather?.marine;

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

                            {weather && (
                                <section className={sharedStyles.weatherCard} aria-label="Meteo dell'attività">
                                    <div className={sharedStyles.weatherHeader}>
                                        <span className={sharedStyles.weatherIcon} aria-hidden="true">☁</span>
                                        <div>
                                            <strong>Meteo del giorno</strong>
                                            <span>{weather.date || post.eventDate || "Data appuntamento"}</span>
                                        </div>
                                    </div>
                                    <div className={sharedStyles.weatherGrid}>
                                        <div><span>Condizioni</span><strong>{weatherLabels[atmospheric?.weatherCode] || "-"}</strong></div>
                                        <div><span>Temperatura</span><strong>{atmospheric?.temperatureMin ?? "-"}° / {atmospheric?.temperatureMax ?? "-"}°C</strong></div>
                                        <div><span>Pioggia</span><strong>{atmospheric?.precipitationProbability ?? "-"}%</strong></div>
                                        <div><span>Vento</span><strong>{atmospheric?.windSpeedMax ?? "-"} km/h</strong></div>
                                        <div><span>Direzione vento</span><strong>{getWindDirectionLabel(atmospheric?.windDirection)}</strong></div>
                                        <div><span>Onde max</span><strong>{marine?.waveHeightMax ?? "-"} m</strong></div>
                                        <div><span>Periodo onde</span><strong>{marine?.wavePeriodMax ?? "-"} s</strong></div>
                                        <div><span>Temperatura acqua</span><strong>{marine?.seaSurfaceTemperature ?? "-"}°C</strong></div>
                                    </div>
                                </section>
                            )}

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
                                                            {c.authorAvatar || c.author?.avatar ? (
                                                                <img
                                                                    src={resolveAvatarUrl(c.authorAvatar || c.author.avatar) || SWIMMING_AVATAR}
                                                                    alt=""
                                                                    className={sharedStyles.avatar}
                                                                    onError={(event) => {
                                                                        event.currentTarget.onerror = null;
                                                                        event.currentTarget.src = SWIMMING_AVATAR;
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className={sharedStyles.avatar}>{(c.authorName ?? c.author?.name ?? "U").charAt(0).toUpperCase()}</span>
                                                            )}
                                                            <span className={sharedStyles.commentAuthor}>{c.authorName ?? c.author?.name ?? "Utente"}</span>
                                                        </div>
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
