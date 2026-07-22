import { TabPanel, Tabs } from "../../Tabs/Tabs";
import PostList from "../PostList/PostList";
import { useSocketEmit } from "../../../socket/useSocketEmit"; // adatta il path
import { useSocket } from "../../../socket/SocketContext"; // adatta il path
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Loader from "../../Loader/Loader.component";
import styles from "./PostPage.module.css";
import { useNavigate } from "react-router-dom";
import { userSelectors } from "../../../reducers/user.slice";
import Card from '../../Card/Card';

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
  const { listPosts } = useSocketEmit();
  const { connected } = useSocket();

  useEffect(() => {
    if (!connected) return;

    const retrievePosts = async () => {
      setIsLoading(true);
      try {
        const data = await listPosts();
        setPosts(data);
      } catch (error) {
        console.error("Errore nel recupero dei post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    retrievePosts();
  }, [connected]);

  const handlePostStatusChange = (postId, newStatus) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, status: newStatus } : p))
    );
  };

  return (
    <Card>
      <div className={styles.page}>
        <section className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Post creati</h2>

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
    </Card>
  );
};

export default PostPage;