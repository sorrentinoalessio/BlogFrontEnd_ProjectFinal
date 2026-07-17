import { useState, useEffect } from "react";
import { getPostPublic } from "../../services/postPublic.service";
import styles from "./PostPublicList.module.css"; // ← aggiunge l'import mancante

export default function PublicPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPostPublic();
        setPosts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

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
        {posts.map((post) => (
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
          </li>
        ))}
      </ul>
    </section>
  );
}