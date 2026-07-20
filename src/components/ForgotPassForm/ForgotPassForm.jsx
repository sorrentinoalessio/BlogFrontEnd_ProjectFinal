import { useState } from "react";
import styles from "../ForgotPassForm/ForgotPassForm.module.css";
import { forgotPassword } from "../services/forgotPass.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";

const ForgotPasswordForm = () => {
    const navigate = useNavigate();

    const [formValue, setFormValue] = useState({
        email: "",
    });

    const [emailError, setEmailError] = useState("");
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEmailError("");
        setServerError("");
        let hasError = false;

        if (!formValue.email || formValue.email.trim() === "") {
            setEmailError("Email obbligatoria");
            hasError = true;
        } else if (!formValue.email.includes("@") || !formValue.email.includes(".")) {
            setEmailError("Email non valida");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await forgotPassword({
                email: formValue.email,
            });
            toast.success("Password reset link inviato con successo. Controlla la tua email.");
            navigate("/login");
        } catch (error) {
            setServerError(error.message);
            toast.error("Reset password fallito.");
        }
    };

    const emailOk =
        formValue.email.trim() !== "" &&
        formValue.email.includes("@") &&
        formValue.email.includes(".");

    return (
        <Card title="Recupero Password">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
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

                    <button type="submit" className={styles.submitButton}>
                        Reset
                    </button>

                    {serverError && <small className={styles.errorMessage}>{serverError}</small>}
                </div>
            </form>
            <div className={styles.links}>
                <Link to="/login">login</Link>
                <span> | </span>
                <Link to="/registration">Registrati</Link>
            </div>
        </Card>
    );
};

export default ForgotPasswordForm;