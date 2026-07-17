import { toast } from "react-toastify";
import { updatePostStatus } from "../../services/post.service";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./PostList.module.css";

const STEP = 5;

const PostList = ({ posts = [], user, onPostStatusChange }) => {
  const [openComments, setOpenComments] = useState({});
  const [visibleCount, setVisibleCount] = useState(STEP);
  const [localPosts, setLocalPosts] = useState(posts);
  const loaderRef = useRef(null);

  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const changeStatus = async (postId, newStatus) => {
    const oldPosts = localPosts;

    setLocalPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, status: newStatus } : p))
    );

    try {
      await updatePostStatus(postId, { status: newStatus });
      onPostStatusChange?.(postId, newStatus); // <- aggiorna anche stato in PostPage
      toast.success("Stato aggiornato");
    } catch (err) {
      setLocalPosts(oldPosts);
      toast.error(err?.message || "Errore aggiornamento stato");
    }
  };

  const visiblePosts = useMemo(
    () => localPosts.slice(0, visibleCount),
    [localPosts, visibleCount]
  );

    useEffect(() => {
        setVisibleCount(STEP); // reset quando cambia la lista (tab diversa)
    }, [posts]);

    useEffect(() => {
        const target = loaderRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + 1, posts.length)); // uno alla volta
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
                    const likesCount = Array.isArray(post.likes) ? post.likes.length : post.likesCount ?? 0;
                    const isOpen = !!openComments[post._id];

                    return (
                        <li key={post._id} className={styles.card}>
                            <h3 className={styles.title}>{post.title}</h3>
                            <p className={styles.description}>{post.description}</p>

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
                                                            <div className={styles.statusRow}>
                                <label htmlFor={`status-${post._id}`} className={styles.statusLabel}>
                                    Stato
                                </label>
                                <select
                                    id={`status-${post._id}`}
                                    className={styles.statusSelect}
                                    value={post.status}
                                    onChange={(e) => changeStatus(post._id, e.target.value)}
                                >
                                    <option value="draft">Bozza</option>
                                    <option value="public">Pubblicato</option>
                                    <option value="archived">Archiviato</option>
                                </select>
                            </div>

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.commentsBtn}
                                    onClick={() => toggleComments(post._id)}
                                >
                                    {isOpen ? "Nascondi commenti" : `Commenti (${comments.length})`}
                                </button>

                                <span className={styles.likes}>❤️ {likesCount}</span>
                            </div>

                            {isOpen && (
                                <ul className={styles.commentsList}>
                                    {comments.length ? (
                                        comments.map((c, i) => (
                                            <li key={c._id || i} className={styles.commentItem}>
                                                <strong>{c.author?.name || c.author || "Utente"}:</strong> {c.text || c.content}
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