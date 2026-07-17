import { useState, useEffect } from "react";
import styles from "./ResetPassForm.module.css";
import { resetPassword, verifyResetToken } from "../services/resetPass.service.js";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate, useParams } from 'react-router-dom';

const ResetPasswordForm = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [checkingToken, setCheckingToken] = useState(true);

    const [formValue, setFormValue] = useState({
        password: "",
        confermaPassword: "",
    });

    const [errors, setErrors] = useState({
        password: "",
        confermaPassword: "",
    });

    useEffect(() => {
        const checkToken = async () => {
            try {
                await verifyResetToken(token);
                setCheckingToken(false);
            } catch (error) {
                toast.error("Link non valido o scaduto");
                navigate("/login", { replace: true });
            }
        };
        checkToken();
    }, [token, navigate]);

    const handleChange = (e) => {
        setErrors({ ...errors, [e.target.name]: "" });
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = { password: "", confermaPassword: "" };

        if (!formValue.password || formValue.password.trim() === "") {
            newErrors.password = "Password obbligatoria";
        } else if (formValue.password.length < 6) {
            newErrors.password = "La password deve essere lunga almeno 6 caratteri";
        }
        if (!formValue.confermaPassword || formValue.confermaPassword.trim() === "") {
            newErrors.confermaPassword = "Conferma la password";
        } else if (formValue.password !== formValue.confermaPassword) {
            newErrors.confermaPassword = "Le password non coincidono";
        }

        setErrors(newErrors);

        if (Object.values(newErrors).every((err) => err === "")) {
            try {
                const data = await resetPassword({
                    passwordNew: formValue.password,
                    token: token
                });
                toast.success("password reset con successo. Ora puoi effettuare il login.");
                navigate("/login");
            } catch (error) {
                setErrors((prev) => ({ ...prev, password: error.message }));
                toast.error("reset password fallito");
            }
        }
    };

    if (checkingToken) return <p>Verifica del link in corso...</p>;

    return (
        <Card title="Reset Password">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        value={formValue.password}
                        id="password"
                        onChange={handleChange}
                    />
                </div>
                {errors.password && <small className={styles.errorMessage}>{errors.password}</small>}

                <div className={styles.form_field}>
                    <label htmlFor="confermaPassword">Conferma password</label>
                    <input
                        type="password"
                        placeholder="Conferma password"
                        name="confermaPassword"
                        value={formValue.confermaPassword}
                        id="confermaPassword"
                        onChange={handleChange}
                    />
                </div>
                {errors.confermaPassword && <small className={styles.errorMessage}>{errors.confermaPassword}</small>}

                <button type="submit" className={styles.submit_button}>
                    Reset Password
                </button>
            </form>
        </Card>
    );
};

export default ResetPasswordForm;