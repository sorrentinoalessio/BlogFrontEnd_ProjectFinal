import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import Card from '../Card/Card';
import { ThemeContext } from '../../contexts/ThemeProvider';
import PublicPosts from '../Posts/PostPublicList/PostPublicList';
import { useAuth } from "../../hooks/useAuth";
import styles from './Home.module.css'; // <-- aggiungi il path corretto

const Home = () => {
  const { theme, switchTheme } = useContext(ThemeContext); // tieni solo se li usi
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <p className={styles.title}>Post publicati</p>
        </div>

        <PublicPosts />
      </section>
    </div>
  );
}; 
export default Home;