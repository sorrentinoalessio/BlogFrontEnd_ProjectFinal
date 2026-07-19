import { TabPanel, Tabs } from "../../Tabs/Tabs";
import PostList from "../PostList/PostList";
import { getPost } from "../../services/post.service";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Loader from "../../Loader/Loader.component";
import styles from "./PostPage.module.css";
import { useNavigate } from "react-router-dom";
import { userSelectors } from "../../../reducers/user.slice"; // adatta il path

const STATUS = [
  { value: "draft", label: "Bozze" },
  { value: "public", label: "Pubblicati" },
  { value: "archived", label: "Archiviate" },
];

const PostPage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const user = useSelector(userSelectors.selectUser);

  useEffect(() => {
    const token = user?.accessToken;
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
  }, [user?.accessToken]);

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