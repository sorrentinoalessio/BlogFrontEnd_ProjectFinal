import { useState, useEffect, useRef } from "react";
import styles from "./LoginForm.module.css";
import { signIn } from "../services/login.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IoLogIn } from "react-icons/io5";
import { toast } from "react-toastify";



const LoginForm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const hasShownToast = useRef(false);

    useEffect(() => {
        if (hasShownToast.current) return;
        hasShownToast.current = true;
        const confirmed = searchParams.get('confirmed');
        console.log(confirmed);
        if (confirmed === 'true') {
            setTimeout(() => toast.success('Conferma avvenuta. Registrazione completata!'), 0);
            navigate('/login', { replace: true });
        } else if (confirmed === 'false') {
            setTimeout(() => toast.error(searchParams.get('message') || 'Errore durante la conferma.'), 0);
            navigate('/login', { replace: true });
        }
    }, []);


    useEffect(() => {
        if (localStorage.getItem("token")) {
            navigate("/");
        }
    }, [navigate]);

    const [formValue, setFormValue] = useState({
        email: "",
        password: "",
    });
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormValue({
            ...formValue,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEmailError("");
        setPasswordError("");
        setServerError("");
        let hasError = false;


        if (!formValue.email || formValue.email.trim() === "") {
            setEmailError("Email obbligatoria");
            hasError = true;
        } else
            if (!formValue.email.includes("@")) {
                setEmailError("Email non valida");
                hasError = true;
            }
        if (!formValue.password || formValue.password.trim() === "") {
            setPasswordError("Password obbligatoria");
            hasError = true;
        } else if (formValue.password.length < 6 || formValue.password.includes(" ")) {
            setPasswordError("La password deve essere lunga almeno 6 caratteri");
            hasError = true;
        }
        if (hasError) {
            return;
        }

        try {
            const data = await signIn({
                email: formValue.email,
                password: formValue.password,
            });
            if (data.accessToken) {
                const cleanToken = String(data.accessToken).replace(/^['"]|['"]$/g, "");
                localStorage.setItem("token", cleanToken);
                localStorage.setItem("user", JSON.stringify(data.name));
                window.dispatchEvent(new Event("storage"));
                navigate("/posts");
            }
            toast.success("Login effettuato");
        } catch (error) {
            setServerError(error.message);
            toast.error("Errore nel login");
        }
    };


    const emailOk =
        formValue.email.trim() !== "" && formValue.email.includes("@");

    const passwordOk =
        formValue.password.trim() !== "" &&
        formValue.password.length >= 6 &&
        !formValue.password.includes(" ");

    return (
        <div className={styles.page}>
            <Card className="card" title="Login">

                <form className={styles.form} onSubmit={handleSubmit}>
                    <Input
                        id="email"
                        label="Indirizzo email"
                        type="text"
                        name="email"
                        placeholder="Email"
                        value={formValue.email}
                        error={emailError}
                        status={emailError ? "error" : emailOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="email"
                    />
                    <Input
                        id="password"
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formValue.password}
                        error={passwordError}
                        status={passwordError ? "error" : passwordOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="password"
                    />
                    <button type="submit" className={styles.submitButton} name="login">
                        <IoLogIn /> LOGIN
                    </button>

                    {serverError && <small className={styles.errorMessage}>{serverError}</small>}
                    <div className={styles.RegistrationLink}>
                        <Link to="/registration">Registrati</Link>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default LoginForm;