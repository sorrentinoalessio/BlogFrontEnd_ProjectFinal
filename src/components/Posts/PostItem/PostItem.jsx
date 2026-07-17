import styles from "./PostItem.module.css";
const PostItem = ({ post }) => {
  if (!post) return null;

  const readableDate = post.creationDate
    ? new Date(post.creationDate).toLocaleDateString("it-IT")
    : "-";

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{post.title}</h3>
      <p className={styles.description}>{post.description}</p>

      <div className={styles.meta}>
        <span>Pubblicato il: {readableDate}</span>
      </div>

      <div className={styles.tags}>
        {(post.tag ?? []).map((t) => (
          <span key={t._id} className={styles.tag}>
            #{t.tag}
          </span>
        ))}
      </div>
    </article>
  );
};

export default PostItem;