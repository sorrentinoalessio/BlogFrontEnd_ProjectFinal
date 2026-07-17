import { TabPanel, Tabs } from "../../Tabs/Tabs";
import PostList from "../PostList/PostList";
import { getPost } from "../../services/post.service";
import { useEffect, useState } from "react";
import Loader from "../../Loader/Loader.component";
import styles from "./PostPage.module.css";
import { useNavigate } from "react-router-dom";


const STATUS = [
  { value: "draft", label: "Bozze" },
  { value: "public", label: "Pubblicati" },
  { value: "archived", label: "Archiviate" },
];

const PostPage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const retrievePosts = async () => {
      setIsLoading(true);
      try {
        const data = await getPost(token);
        setPosts(data);
      } catch (error) {
        console.error("Errore nel recupero dei post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    retrievePosts();
  }, []);

  const handlePostStatusChange = (postId, newStatus) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, status: newStatus } : p))
    );
  };

  return (
    <div className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>I tuoi post</h1>
          <button type="button" onClick={() => navigate("/posts/addEditPost")} className={styles.addButton}>
            Aggiungi Post
          </button>

        </div>

        <div className={styles.tabsWrap}>
          <Tabs>
            {STATUS.map((s) => (
              <TabPanel header={s.label} key={s.value}>
                {!isLoading ? (
                  <PostList
                    posts={posts.filter((p) => p.status === s.value)}
                    user={user}
                    onPostStatusChange={handlePostStatusChange}
                  />
                ) : (
                  <Loader />
                )}
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default PostPage;