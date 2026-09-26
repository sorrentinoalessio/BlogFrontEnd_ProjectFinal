import styles from "./PostItem.module.css";
import { formatPostDate, formatPostTime } from "../postDateUtils";
const PostItem = ({ post }) => {
  if (!post) return null;

  const readableDate = formatPostDate(post);
  const readableTime = formatPostTime(post);

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{post.title}</h3>
      <p className={styles.description}>{post.description}</p>

      <div className={styles.meta}>
        <span>Pubblicato il: {readableDate}{readableTime && ` alle ${readableTime}`}</span>
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