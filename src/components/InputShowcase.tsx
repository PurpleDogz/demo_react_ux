"use client";

import { useState } from "react";
import styles from "./InputShowcase.module.css";

export default function InputShowcase() {
  const [textValue, setTextValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [selectValue, setSelectValue] = useState("option1");
  const [checkboxes, setCheckboxes] = useState({ option1: true, option2: false, option3: false });
  const [radioValue, setRadioValue] = useState("radio1");
  const [rangeValue, setRangeValue] = useState(50);
  const [toggleValue, setToggleValue] = useState(false);
  const [dateValue, setDateValue] = useState("2025-01-15");
  const [searchValue, setSearchValue] = useState("");
  const [numberValue, setNumberValue] = useState(42);
  const [activeTab, setActiveTab] = useState("general");

  const handleCheckbox = (key: keyof typeof checkboxes) => {
    setCheckboxes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Input Controls</h2>
      <div className={styles.grid}>
        {/* Text Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="text-input">Text Input</label>
          <input
            id="text-input"
            type="text"
            className={styles.input}
            placeholder="Enter some text..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />
        </div>

        {/* Email Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="email-input">Email</label>
          <input
            id="email-input"
            type="email"
            className={styles.input}
            placeholder="user@example.com"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
          />
        </div>

        {/* Password Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            className={styles.input}
            placeholder="Enter password..."
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        </div>

        {/* Search Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="search-input">Search</label>
          <input
            id="search-input"
            type="search"
            className={styles.input}
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Number Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="number-input">Number</label>
          <input
            id="number-input"
            type="number"
            className={styles.input}
            value={numberValue}
            onChange={(e) => setNumberValue(Number(e.target.value))}
            min={0}
            max={100}
          />
        </div>

        {/* Date Input */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="date-input">Date Picker</label>
          <input
            id="date-input"
            type="date"
            className={styles.dateInput}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </div>

        {/* Select */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="select-input">Select Dropdown</label>
          <select
            id="select-input"
            className={styles.select}
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
          >
            <option value="option1">Engineering</option>
            <option value="option2">Design</option>
            <option value="option3">Marketing</option>
            <option value="option4">Sales</option>
            <option value="option5">Finance</option>
          </select>
        </div>

        {/* Textarea */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="textarea-input">Textarea</label>
          <textarea
            id="textarea-input"
            className={styles.textarea}
            placeholder="Write a longer message..."
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            rows={3}
          />
        </div>

        {/* Checkboxes */}
        <div className={styles.group}>
          <span className={styles.label}>Checkboxes</span>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={checkboxes.option1}
                onChange={() => handleCheckbox("option1")}
              />
              Email notifications
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={checkboxes.option2}
                onChange={() => handleCheckbox("option2")}
              />
              SMS notifications
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={checkboxes.option3}
                onChange={() => handleCheckbox("option3")}
              />
              Push notifications
            </label>
          </div>
        </div>

        {/* Radio Buttons */}
        <div className={styles.group}>
          <span className={styles.label}>Radio Buttons</span>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                className={styles.radio}
                name="priority"
                value="radio1"
                checked={radioValue === "radio1"}
                onChange={(e) => setRadioValue(e.target.value)}
              />
              Low priority
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                className={styles.radio}
                name="priority"
                value="radio2"
                checked={radioValue === "radio2"}
                onChange={(e) => setRadioValue(e.target.value)}
              />
              Medium priority
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                className={styles.radio}
                name="priority"
                value="radio3"
                checked={radioValue === "radio3"}
                onChange={(e) => setRadioValue(e.target.value)}
              />
              High priority
            </label>
          </div>
        </div>

        {/* Range Slider */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="range-input">Range Slider</label>
          <div className={styles.rangeContainer}>
            <input
              id="range-input"
              type="range"
              className={styles.range}
              min={0}
              max={100}
              value={rangeValue}
              onChange={(e) => setRangeValue(Number(e.target.value))}
            />
            <span className={styles.rangeValue}>{rangeValue}%</span>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className={styles.group}>
          <span className={styles.label}>Toggle Switch</span>
          <div className={styles.toggleContainer}>
            <input
              type="checkbox"
              className={styles.toggle}
              checked={toggleValue}
              onChange={(e) => setToggleValue(e.target.checked)}
              id="toggle-switch"
            />
            <label className={styles.toggleText} htmlFor="toggle-switch">
              {toggleValue ? "Enabled" : "Disabled"}
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.group}>
          <span className={styles.label}>Buttons</span>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button">Primary</button>
            <button className={styles.buttonOutline} type="button">Outline</button>
            <button className={styles.buttonDanger} type="button">Danger</button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${styles.group} ${styles.tabGroup}`}>
          <span className={styles.label}>Tabs</span>
          <div className={styles.tabList} role="tablist">
            {[
              { id: "general", label: "General" },
              { id: "security", label: "Security" },
              { id: "notifications", label: "Notifications" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.tabPanel} role="tabpanel">
            {activeTab === "general" && (
              <p>General settings for your account profile, display name, and language preferences.</p>
            )}
            {activeTab === "security" && (
              <p>Manage your password, two-factor authentication, and active sessions.</p>
            )}
            {activeTab === "notifications" && (
              <p>Configure email digests, push alerts, and notification frequency for your account.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
