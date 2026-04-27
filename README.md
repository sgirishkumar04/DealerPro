# DealerPro (DMS)

A comprehensive Dealer Management System (DMS) built with Spring Boot (Backend) and React/Vite (Frontend).

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1.  **Java 17+** (For the Spring Boot backend)
2.  **Node.js (v18+) & npm** (For the React frontend)
3.  **MySQL Server** (Running locally on default port 3306)
4.  **Maven** (Optional, the project includes the Maven wrapper `mvnw`)

---

## 🛠️ Backend Setup (Spring Boot)

1.  **Database Setup:**
    *   Open your MySQL server.
    *   Create a database named `hyundai_dms` (or `dealerpro` depending on your `application.properties`):
        ```sql
        CREATE DATABASE IF NOT EXISTS hyundai_dms;
        ```
    *   *Note:* Check `DealerPro_backend/src/main/resources/application.properties` for the exact database name, username, and password. Update the credentials if your local MySQL uses a different username/password (default is often `root` / `password` or empty).

2.  **Start the Backend:**
    *   Navigate to the backend directory:
        ```bash
        cd DealerPro_backend
        ```
    *   Run the application using the Maven wrapper:
        ```bash
        ./mvnw spring-boot:run
        ```
    *   The backend will start on **http://localhost:8083**.
    *   *(Hibernate will automatically create/update the database tables based on the entities).*

---

## 💻 Frontend Setup (React + Vite)

1.  **Install Dependencies:**
    *   Open a new terminal window.
    *   Navigate to the frontend directory:
        ```bash
        cd DealerPro_frontend
        ```
    *   Install the required NPM packages:
        ```bash
        npm install
        ```

2.  **Start the Frontend:**
    *   Run the development server:
        ```bash
        npm run dev
        ```
    *   The frontend will be available at **http://localhost:3001** (or 5173 depending on your Vite config).

---

## 🔑 Default Credentials

If the application comes with a seed script or default users, use these to log in (check your database `employees` table if unsure):

*   **Admin/Manager Login:** `admin@kia.com` (or similar, check DB)
*   **Password:** `password123` (or whatever is hashed in the database)

---

## ⚙️ Troubleshooting

*   **Port Conflicts:** If ports `8083` or `3001` are in use, find the process and kill it (e.g., `lsof -ti:8083 | xargs kill -9`).
*   **Database connection refused:** Ensure MySQL service is running and the credentials in `application.properties` are correct.
*   **NPM issues:** Try removing `node_modules` and `package-lock.json` and running `npm install` again if you face dependency errors on the new laptop.
