import styles from "./Footer.module.css";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <Link to="/" className={styles.brand}>
            <span className={styles.footerLogo} aria-hidden="true">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="23" cy="17" r="5" fill="currentColor" />
                <circle cx="42" cy="21" r="5" fill="currentColor" opacity="0.72" />
                <path d="M14 31c4.4-5.5 10.8-7 17-2.8l4.2 2.8c4.9-4.5 10.2-4.8 15.2-.8l-2.7 4c-3.6-2.7-6.8-2.5-10.5.9l-4.6 4.2-6.7-4.4c-3.2-2.1-5.7-1.5-8.6 2.1L14 31Z" fill="currentColor" />
                <path d="M9 46c5-4 10-4 15 0s10 4 15 0 10-4 16 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.72" />
              </svg>
            </span>
            <span>Swimigo</span>
          </Link>
          <p>Trova qualcuno con cui nuotare</p>
        </div>

        <nav className={styles.links} aria-label="Link del footer">
          <Link to="/">Home</Link>
          <Link to="/posts">Insegnanti</Link>
          <Link to="/posts/addPost">Pubblica</Link>
          <Link to="/profile">Profilo</Link>
        </nav>

        <div className={styles.waveMark} aria-hidden="true">
          <span>~</span><span>~</span><span>~</span>
        </div>
      </div>

      <div className={styles.bottomLine}>
        <span>© {new Date().getFullYear()} Swimigo</span>
        <span>Nuota con passione</span>
      </div>
    </footer>
  );
};

export default Footer;