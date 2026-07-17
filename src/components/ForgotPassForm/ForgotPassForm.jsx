import { useState, useEffect } from "react";
import styles from "../ForgotPassForm/ForgotPassForm.module.css";
import { forgotPassword } from "../services/forgotPass.service.js";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';


const ForgotPasswordForm = () => {
     const navigate = useNavigate();

    const [formValue, setFormValue] = useState({
        email: ""
    });

    const [errors, setErrors] = useState({
        email: ""
    });

    const handleChange = (e) => {
        setErrors({ ...errors, [e.target.name]: "" });
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };
    useEffect(() => {
        console.log(formValue);
    }, [formValue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = { email: "" };

        if (!formValue.email || formValue.email.trim() === "") {
            newErrors.email = "Email obbligatoria";
        } else if (!formValue.email.includes("@") || !formValue.email.includes(".")) {
            newErrors.email = "Email non valida";
        }

        setErrors(newErrors);

        if (Object.values(newErrors).every((err) => err === "")) {
            try {
                const data = await forgotPassword({
                    email: formValue.email
                });
                toast.success("Password reset link inviato con successo. Controlla la tua email.");
                navigate("/login");
            } catch (error) {
                setErrors((prev) => ({ ...prev, email: error.message }));
                toast.error("Reset password fallito.");
            }
        }
    };

    return (
        <Card title="Recupero Password">
            <form className={styles.form} onSubmit={handleSubmit}>

                <div className={styles.form_field}>
                    <label htmlFor="email">Indirizzo email</label>
                    <input
                        type="text"
                        placeholder="Email"
                        name="email"
                        value={formValue.email}
                        id="email"
                        onChange={handleChange}
                    />
                </div>
{errors.email && <small className={styles.errorMessage}>{errors.email}</small>}

                <button type="submit" className={styles.submit_button}>
                    reset    
                </button>

            </form>
        </Card>
    );
};

export default ForgotPasswordForm;