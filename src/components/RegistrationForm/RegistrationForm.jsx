import { useState, useEffect } from "react";
import styles from "./RegistrationForm.module.css";
import { signUp } from "../services/registration.service.js";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';


const RegistrationForm = () => {
     const navigate = useNavigate();

    const [formValue, setFormValue] = useState({
        nome: "",
        email: "",
        password: "",
        confermaPassword: "",
    });

    const [errors, setErrors] = useState({
        nome: "",
        email: "",
        password: "",
        confermaPassword: "",
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
        const newErrors = { nome: "", email: "", password: "", confermaPassword: "" };

        if (!formValue.nome || formValue.nome.trim() === "") {
            newErrors.nome = "Nome obbligatorio";
        }
        if (!formValue.email || formValue.email.trim() === "") {
            newErrors.email = "Email obbligatoria";
        } else if (!formValue.email.includes("@") || !formValue.email.includes(".")) {
            newErrors.email = "Email non valida";
        }
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
                const data = await signUp({
                    name: formValue.nome,
                    email: formValue.email,
                    password: formValue.password,
                });
                toast.success("registrazione avvenuta con successo, conferma la tua email");
                navigate("/login");
            } catch (error) {
                setErrors((prev) => ({ ...prev, email: error.message }));
                toast.error("registrazione fallita");
            }
        }
    };

    return (
        <Card title="Registrati">
            <form className={styles.form} onSubmit={handleSubmit}>

                <div className={styles.form_field}>
                    <label htmlFor="nome">Nome</label>
                    <input
                        type="text"
                        placeholder="Nome"
                        name="nome"
                        value={formValue.nome}
                        id="nome"
                        onChange={handleChange}
                    />
                </div>
{errors.nome && <small className={styles.errorMessage}>{errors.nome}</small>}

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
                    Registrati
                </button>

            </form>
        </Card>
    );
};

export default RegistrationForm;