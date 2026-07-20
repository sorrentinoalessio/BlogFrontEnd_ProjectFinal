import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styles from "./Header.module.css";
import { clearUser, userSelectors } from "../../reducers/user.slice"; // adatta il path

const Header = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(userSelectors.selectUser);
    const isLoggedIn = !!user?.accessToken;

    const handleLogout = () => {
        dispatch(clearUser());
        navigate("/login");
    };

    return (
        <header className={styles.main_header}>
            <h1 className={styles.title}>Blog</h1>

            <div className={styles.right}>
                {isLoggedIn ? (
                    <button type="button" onClick={handleLogout} className={styles.auth_link}>
                        Esci
                    </button>
                ) : (
                    <Link to="/login" className={styles.auth_link}>
                        Accedi
                    </Link>
                )}
            </div>
        </header>
    );
};

export default Header;