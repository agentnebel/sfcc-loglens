# SFCC LogLens 🔍

SFCC LogLens is a powerful, modern log analysis tool designed specifically for Salesforce Commerce Cloud (SFCC) developers. It streamlines the debugging process by automatically fetching, parsing, and clustering WebDAV logs into an actionable, high-level interface.

Developed to replace manual log-grepping, LogLens uses intelligent fingerprinting and custom-tailored parsing logic to help you identify critical issues instantly.

---

## ✨ Key Features

-   **🚀 Intelligent Error Clustering:** Automatically groups thousands of raw log entries into unique "Signatures" using MD5 fingerprinting (with automated noise removal for IDs/UUIDs).
-   **🎯 Headline Extraction:** Intelligently identifies and prioritizes Error Types (e.g., `TypeError`, `ReferenceError`, or specific Java Exceptions) for clear list headlines.
-   **🏷️ Custom Tag Support:** Supports custom logging prefixes (e.g., `SHORT_ERROR:`, `CART_FATAL:`) to give you direct control over the error hierarchy.
-   **📅 Sorting & Filtering:** Toggle between STG, DEV, or a combined view. Sort errors instantly by Environment, Frequency (Count), or Last Seen.
-   **🆔 Robust ID Tracking:** Tracks up to 3 unique Request IDs per error group, making it easy to cross-reference issues in the Log Center.
-   **📋 Incident Template Generator:** Generate pre-formatted Markdown templates for Jira or ServiceNow tickets with one click, including site IDs, request IDs, and stack traces.
-   **🔗 Global Log Center Integration:** Persist your Log Center Base URL globally and access deep links or the main dashboard directly from the Sidebar.
-   **🛡️ Corporate-Ready (SSL Bypass):** Built-in bypass for Zscaler and corporate proxies that often interfere with SSL certificate validation (`rejectUnauthorized: false`).

---

## 🛠️ Tech Stack

-   **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Desktop Wrapper:** [Electron](https://www.electronjs.org/)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **Time Handling:** [Day.js](https://day.js.org/)
-   **Networking:** [Axios](https://axios-http.com/) with custom WebDAV client

---

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
-   `npm` or `yarn`

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/agentnebel/sfcc-loglens.git
    cd sfcc-loglens
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in development mode:**
    ```bash
    npm run dev
    ```

4.  **Build for production:**
    ```bash
    npm run build
    ```

---

## ⚙️ Configuration

1.  Open the **Settings** tab from the Sidebar.
2.  Select **STG** or **DEV** to configure your instance-specific WebDAV credentials (URL, Username, and Access Key).
3.  Switch to the **Log Center** view in Settings to configure your global Salesforce Log Center Base URL.
4.  Use the **"Test Connection"** button to verify your credentials before fetching.

---

## 💡 Best Practice: Custom Headlines

To get the most out of LogLens, use custom prefixes in your SFCC JavaScript code:

```javascript
var Logger = require('dw/system/Logger');
try {
    // some risky code
} catch (e) {
    // LogLens will automatically extract "API_TIMEOUT" as the bold Headline!
    Logger.error("API_TIMEOUT: Connection to external service failed", e);
}
```

---

## 👤 Author

**Sven Belz**
-   GitHub: [@agentnebel](https://github.com/agentnebel)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
