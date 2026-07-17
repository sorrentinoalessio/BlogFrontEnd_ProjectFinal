import { useState, useEffect } from "react";
import { Link, useNavigate, NavLink ,useLocation } from "react-router-dom";
import styles from "./Header.module.css";


const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem("token"));
    }, [location]); // aggiorna stato login quando cambia percorso (es. dopo logout)

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "token") setIsLoggedIn(!!e.newValue);
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
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