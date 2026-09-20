import { toast } from "react-toastify";
import { updatePostStatus } from "../../services/post.service";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PostList.module.css";

const STEP = 5;
const statusOptions = [
    { value: "draft", label: "Bozza" },
    { value: "public", label: "Pubblicato" },
    { value: "archived", label: "Archiviato" },
];

const PostList = ({ posts = [], user, onPostStatusChange }) => {
    const [openComments, setOpenComments] = useState({});
    const [visibleCount, setVisibleCount] = useState(STEP);
    const [openStatusId, setOpenStatusId] = useState(null);
    const [localPosts, setLocalPosts] = useState(posts);
    const loaderRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        setLocalPosts(posts);
    }, [posts]);

    const changeStatus = async (postId, newStatus) => {
        const oldPosts = localPosts;
        setLocalPosts((prev) =>
            prev.map((p) => (p._id === postId ? { ...p, status: newStatus } : p))
        );
        try {
            await updatePostStatus(postId, { status: newStatus }, user?.accessToken);
            onPostStatusChange?.(postId, newStatus);
            toast.success("Stato aggiornato");
        } catch (err) {
            setLocalPosts(oldPosts);
            toast.error(err?.message || "Errore aggiornamento stato");
        }
    };

    const goToEditPost = (post) => {
        navigate(`/posts/editPost/${post._id}`, { state: { post } });
    };

    const visiblePosts = useMemo(
        () => localPosts.slice(0, visibleCount),
        [localPosts, visibleCount]
    );

    useEffect(() => {
        setVisibleCount(STEP);
    }, [posts]);

    useEffect(() => {
        const target = loaderRef.current;
        if (!target) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + 1, posts.length));
                }
            },
            { root: null, rootMargin: "120px", threshold: 0.1 }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [posts.length]);

    const toggleComments = (postId) => {
        setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
    };

    if (!posts.length) return <p className={styles.empty}>Nessun post disponibile</p>;

    return (
        <>
            <ul className={styles.list}>
                {visiblePosts.map((post) => {
                    const comments = post.comments ?? [];
                    const enrollCount = Array.isArray(post.enroll)
                        ? post.enroll.length
                        : post.enrollCount ?? 0;
                    const isOpen = !!openComments[post._id];
                    const statusClass =
                        post.status === "draft"
                            ? styles.statusDraft
                            : post.status === "archived"
                                ? styles.statusArchived
                                : styles.statusPublic;

                    return (
                        <li
                            key={post._id}
                            className={styles.card}
                            style={{
                                borderLeftColor:
                                    post.status === "draft"
                                        ? "#f59e0b"
                                        : post.status === "archived"
                                            ? "#9ca3af"
                                            : "#22c55e",
                            }}
                        >
                            <div className={styles.cardImageWrap}>
                                <img
                                    className={styles.cardImage}
                                    src={
                                        post.imageUrl ||
                                        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80"
                                    }
                                    alt={post.title || "Insegnante di nuoto"}
                                />
                                <button type="button" className={styles.favoriteBtn} aria-label="Salva post">
                                    ♡
                                </button>
                            </div>

                            <div className={styles.cardContent}>
                                <p className={styles.name}>Titolo post</p>
                                <h3 className={styles.title}>{post.title}</h3>
                                <p className={styles.description}>{post.description}</p>

                                <div className={styles.metaRow}>
                                    <span className={styles.star}>★</span>
                                    <span className={styles.reviews}>5</span>
                                    <span className={styles.reviewCount}>(17 commenti)</span>
                                </div>

                                <div className={styles.teacher}>
                                    <span className={styles.teacherRole}>{post.ownerName || "Insegnante"}</span>
                                </div>

                                <div className={styles.priceRow}>
                                    <span className={styles.price}>{post.price || "40€"}</span>
                                    <span className={styles.priceSuffix}>/ora</span>
                                </div>
                            </div>

                            <div className={styles.statusRow}>
                                <span className={styles.statusLabel} id={`status-${post._id}`}>
                                    Stato
                                </span>
                                <div className={styles.statusSelect}>
                                    <button
                                        type="button"
                                        className={`${styles.statusTrigger} ${statusClass}`}
                                        aria-expanded={openStatusId === post._id}
                                        aria-haspopup="listbox"
                                        aria-labelledby={`status-${post._id}`}
                                        onClick={() => setOpenStatusId((current) => current === post._id ? null : post._id)}
                                    >
                                        {statusOptions.find((option) => option.value === post.status)?.label}
                                        <span className={styles.statusChevron} aria-hidden="true" />
                                    </button>
                                    {openStatusId === post._id && (
                                        <div className={styles.statusMenu} role="listbox" aria-labelledby={`status-${post._id}`}>
                                            {statusOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={post.status === option.value}
                                                    className={`${styles.statusOption} ${post.status === option.value ? styles.statusOptionActive : ""}`}
                                                    onClick={() => {
                                                        setOpenStatusId(null);
                                                        changeStatus(post._id, option.value);
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

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

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.editBtn}
                                    onClick={() => goToEditPost(post)}
                                >
                                    Edit
                                </button>

                                <div className={styles.rightActions}>
                                    <span className={styles.enroll}>❤️ {enrollCount}</span>

                                    <button
                                        type="button"
                                        className={styles.commentsBtn}
                                        onClick={() => toggleComments(post._id)}
                                    >
                                        {isOpen
                                            ? "Nascondi commenti"
                                            : `💬 Commenti (${comments.length})`}
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <ul className={styles.commentsList}>
                                    {comments.length ? (
                                        comments.map((c, i) => (
                                            <li key={c._id || i} className={styles.commentItem}>
                                                <strong className={styles.commentAuthor}>
                                                    {c.authorName ?? c.author?.name ?? "Utente"}:
                                                </strong>{" "}
                                                {c.comment ?? c.text ?? c.content}
                                            </li>
                                        ))
                                    ) : (
                                        <li className={styles.commentItem}>Nessun commento</li>
                                    )}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>

            {visibleCount < posts.length && <div ref={loaderRef} style={{ height: 1 }} />}
        </>
    );
};

export default PostList;