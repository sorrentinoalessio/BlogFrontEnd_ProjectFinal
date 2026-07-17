import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} MyBlog</p>
    </footer>
  );
};

export default Footer;