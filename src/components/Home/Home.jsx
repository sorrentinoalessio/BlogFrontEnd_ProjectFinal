import { useNavigate } from 'react-router-dom';
import PublicPosts from '../Posts/PostPublicList/PostPublicList';
import styles from './Home.module.css'; // <-- aggiungi il path corretto

const Home = () => {
  return (
    <div className={styles.page}>
      <section className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <div className={styles.header}>
            </div>
            <PublicPosts />
          </div>
        </div>
      </section>
    </div>
  );
}; 
export default Home;