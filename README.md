# DealerPro (DMS)

A comprehensive Dealer Management System (DMS) built with Spring Boot (Backend) and React/Vite (Frontend). 

**Phase 2 Update**: The backend has been refactored into a **Maven Multi-Module Architecture** for better scalability, security, and separation of concerns.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1.  **Java 17+** (For the Spring Boot backend)
2.  **Node.js (v18+) & npm** (For the React frontend)
3.  **Maven** (Optional, the project includes the Maven wrapper `mvnw`)
*(Note: The project defaults to a self-contained SQLite database!)*

---

## 🏗️ Backend Architecture (Multi-Module)

The backend is physically separated into three architectural layers:
- **`DealerPro_core`**: Entities, Repositories, and Database drivers.
- **`DealerPro_service`**: Business Logic, DTOs, and Scheduling.
- **`DealerPro_api`**: Controllers, Security Filters, and Main Application.

---

## 🛠️ Backend Setup (Spring Boot)

1.  **Database Setup:**
    *   The project uses a pre-configured **SQLite** database by default.
    *   The database file is located at `db/DealerPro.db`. The system is configured to find it relatively from the API module.

2.  **Build and Install Modules:**
    *   Navigate to the backend directory:
        ```bash
        cd DealerPro_backend
        ```
    *   Build the entire reactor (all modules):
        ```bash
        ./mvnw clean install
        ```

3.  **Start the Backend:**
    *   Navigate to the executable API module:
        ```bash
        cd DealerPro_api
        ```
    *   Run the application:
        ```bash
        mvn spring-boot:run
        ```
    *   The backend will start on **http://localhost:8083**.

---

## 💻 Frontend Setup (React + Vite)

1.  **Install Dependencies:**
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
    *   The frontend will be available at **http://localhost:3001**.

---

## 🔑 Default Credentials

*   **Admin/Manager Login:** `admin@kia.com`
*   **Password:** `password123`

---

## ⚙️ Troubleshooting

*   **Database Path Issues**: Since this is a multi-module project, ensure the database path in `application.properties` is set to `../../db/DealerPro.db` so it can be found from the `DealerPro_api` execution context.
*   **Port Conflicts**: If ports `8083` or `3001` are in use, kill the process: `lsof -ti:8083 | xargs kill -9`.
*   **Maven Errors**: If you get "Module not found" errors, ensure you run `./mvnw clean install` from the **root** of `DealerPro_backend` before running the API module.
