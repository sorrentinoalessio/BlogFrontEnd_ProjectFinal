import styles from "./Card.module.css";

 const Card = ({title,sottotitolo, children}) => {
    return <div className={styles.card} data-testid="card-component">
    <h2>{title}</h2>
    <p>{sottotitolo}</p>
    {children}
    </div>
}
export default Card;