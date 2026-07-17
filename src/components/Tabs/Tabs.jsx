import { useState, Children } from "react";
import styles from "./Tabs.module.css";

export const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  const items = Children.toArray(children);

  const tabHeaders = items.map((child, index) => (
    <button
      key={index}
      type="button"
      role="tab"
      aria-selected={activeTab === index}
      className={`${styles["tab-card"]} ${activeTab === index ? styles.active : ""}`}
      onClick={() => setActiveTab(index)}
    >
      {child.props.header}
    </button>
  ));

  return (
    <section className={styles["tab-container"]}>
      <div className={styles["tabs-headers"]} role="tablist">
        {tabHeaders}
      </div>
      <div className={styles["tabs-contents"]} role="tabpanel">
        {items[activeTab]}
      </div>
    </section>
  );
};

export const TabPanel = ({ children }) => <div>{children}</div>;