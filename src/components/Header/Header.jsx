import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./Header.module.css";
import { clearUser, userSelectors } from "../../reducers/user.slice";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(userSelectors.selectUser);
  const isLoggedIn = !!user?.accessToken;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/login");
  };

  return (
    <header className={styles.mainHeader}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand} aria-label="Swimigo home">
          <span className={styles.logoIcon} aria-hidden="true">
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <circle cx="23" cy="17" r="5" fill="currentColor"/>
              <circle cx="42" cy="21" r="5" fill="currentColor" opacity="0.72"/>
              <path d="M14 31c4.4-5.5 10.8-7 17-2.8l4.2 2.8c4.9-4.5 10.2-4.8 15.2-.8l-2.7 4c-3.6-2.7-6.8-2.5-10.5.9l-4.6 4.2-6.7-4.4c-3.2-2.1-5.7-1.5-8.6 2.1L14 31Z" fill="currentColor"/>
              <path d="M9 46c5-4 10-4 15 0s10 4 15 0 10-4 16 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.72"/>
              <path d="M9 53c5-4 10-4 15 0s10 4 15 0 10-4 16 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.46"/>
            </svg>
          </span>
          <span className={styles.brandCopy}>
            <span className={styles.brandText}>Swimigo</span>
            <span className={styles.brandTagline}>Trova qualcuno con cui nuotare</span>
          </span>
        </Link>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ""}`} aria-label="Navigazione principale">
          <Link to="/" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Home</Link>
          <Link to="/posts" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Insegnanti</Link>
          <Link to="/posts/addPost" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Corsi</Link>
          <Link to="/profile" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Profilo</Link>
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn}>Pubblica</button>
          {isLoggedIn ? (
            <button type="button" onClick={handleLogout} className={styles.primaryBtn}>
              Esci
            </button>
          ) : (
            <Link to="/login" className={styles.primaryBtn}>
              Accedi
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;