import { useState, useEffect, useRef } from "react";
import styles from "./ResetPassForm.module.css";
import { resetPassword, verifyResetToken } from "../services/resetPass.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

const ResetPasswordForm = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [checkingToken, setCheckingToken] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const hasChecked = useRef(false);

    const [formValue, setFormValue] = useState({
        password: "",
        confermaPassword: "",
    });

    const [passwordError, setPasswordError] = useState("");
    const [confermaPasswordError, setConfermaPasswordError] = useState("");
    const [serverError, setServerError] = useState("");

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        const checkToken = async () => {
            try {
                await verifyResetToken(token);
                setCheckingToken(false);
                setTokenValid(true);
                toast.success("Link confermato, inserisci la nuova password");

            } catch (error) {
                toast.error("Link non valido o scaduto");
                navigate("/login", { replace: true });
            }
        };
        checkToken();
    }, [token, navigate]);

    const handleChange = (e) => {
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setConfermaPasswordError("");
        setServerError("");
        let hasError = false;

        if (!formValue.password || formValue.password.trim() === "") {
            setPasswordError("Password obbligatoria");
            hasError = true;
        } else if (formValue.password.length < 6) {
            setPasswordError("La password deve essere lunga almeno 6 caratteri");
            hasError = true;
        }
        if (!formValue.confermaPassword || formValue.confermaPassword.trim() === "") {
            setConfermaPasswordError("Conferma la password");
            hasError = true;
        } else if (formValue.password !== formValue.confermaPassword) {
            setConfermaPasswordError("Le password non coincidono");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await resetPassword({
                passwordNew: formValue.password,
                token: token,
            });
            toast.success("password reset con successo. Ora puoi effettuare il login.");
            navigate("/login");
        } catch (error) {
            setServerError(error.message);
            toast.error("reset password fallito");
        }
    };

    const passwordOk =
        formValue.password.trim() !== "" && formValue.password.length >= 6;

    const confermaPasswordOk =
        formValue.confermaPassword.trim() !== "" &&
        formValue.password === formValue.confermaPassword;

    if (checkingToken) return <p>Verifica del link in corso...</p>;

    return (
        <Card title="Reset Password">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
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
                    <Input
                        id="confermaPassword"
                        label="Conferma password"
                        type="password"
                        name="confermaPassword"
                        placeholder="Conferma password"
                        value={formValue.confermaPassword}
                        error={confermaPasswordError}
                        status={confermaPasswordError ? "error" : confermaPasswordOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="confermaPassword"
                    />

                    <button type="submit" className={styles.submitButton}>
                        Reset Password
                    </button>

                    {serverError && <small className={styles.errorMessage}>{serverError}</small>}
                </div>
            </form>
        </Card>
    );
};

export default ResetPasswordForm;