import { useState } from "react";
import FormField from "../FormField/FormField";
import styles from "../Card/Card.module.css";

const Input = ({ id, label, error, status = "", ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === "password";
  const input = (
    <input
      id={id}
      {...props}
      type={isPassword && showPassword ? "text" : props.type}
      className={`${styles.input} ${isPassword ? styles.passwordInput : ""} ${status === "error" ? styles.inputError : ""} ${status === "success" ? styles.inputSuccess : ""}`}
    />
  );

  return (
    <FormField id={id} label={label} error={error}>
      {isPassword ? (
        <div className={styles.passwordWrap}>
          {input}
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Nascondi password" : "Mostra password"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Nascondi" : "Mostra"}
          </button>
        </div>
      ) : input}
    </FormField>
  );
};

export default Input;