# Phase 2 Presentation Guide: Enhancements & Resilience

This guide provides a step-by-step script and demonstration plan for your Phase 2 presentation of the DealerPro application.

---

## Introduction (2 mins)
*   **What to say:** "Welcome to the Phase 2 presentation of DealerPro. In this phase, we focused on **Enhancements & Resilience**. Our primary goals were to harden the application's security, optimize performance through caching and architecture redesign, handle complex data operations, and introduce robust file management and data visualization."

---

## 1. Security Upgrades (5 mins)

### PII Encryption
*   **What to say:** "We implemented field-level encryption for Personally Identifiable Information (PII) to ensure data privacy and compliance."
*   **How to show:** Open the `Employee` or `Customer` entity in your IDE. Show the `@Convert(converter = AttributeEncryptor.class)` annotation on sensitive fields (like email or phone). You can also show the database directly to prove that the data stored in the actual columns is encrypted (unreadable text), while the application decrypts it seamlessly for the UI.

### Multi-Factor Authentication (MFA)
*   **What to say:** "To protect administrative and dealer accounts, we integrated an Email-based OTP Multi-Factor Authentication system."
*   **How to show:** Log in with a user account that has MFA enabled. Show the screen prompting for the 6-digit OTP. Check the terminal (or your email) for the OTP, enter it, and demonstrate successful login.

### Unlock Account After 10 Minutes (Spring Batch / Scheduler)
*   **What to say:** "We built a defense mechanism against brute-force attacks. After 5 failed login attempts, an account is locked. A background job automatically unlocks it after 10 minutes."
*   **How to show:** Show the `application.properties` configuring the lock duration (`app.security.lock-duration-minutes=10`). Briefly show the Spring Scheduled task (`AccountUnlockTask` or similar) that scans the database and resets the `failedAttempt` count and `accountNonLocked` status.

### JWT Blacklist
*   **What to say:** "For secure logouts, we implemented a JWT Blacklist using Redis (or an in-memory cache). When a user logs out, their token is immediately invalidated, preventing replay attacks."
*   **How to show:** Log in, get the token, and log out. Then, use Postman or Swagger to try and access a protected API using the *same* token. Show that the backend rejects it with a `401 Unauthorized` because the token is blacklisted.

---

## 2. Advanced Data & Testing (5 mins)

### Search Across Multiple Columns (QueryDSL)
*   **What to say:** "We replaced basic JPA repositories with QueryDSL to support dynamic, multi-column searching, filtering, and sorting directly from the UI."
*   **How to show:** Go to the **Inventory** or **Leads** page. Open the advanced filter drawer. Add multiple filters (e.g., Status = 'IN_STOCK' AND Model = 'EV6'). Show how the backend dynamically builds the SQL query and returns the exact results.

### Optimistic Locking
*   **What to say:** "To prevent data loss when multiple managers edit the same record concurrently, we implemented Optimistic Locking using the `@Version` annotation."
*   **How to show:** Open two browser tabs on the *same* Lead or Inventory item. In Tab 1, update a field and save. In Tab 2, try to update a different field and save. Show the "Update Conflict" dialog that pops up in Tab 2, proving the system caught the concurrent modification.

### Transpose Result
*   **What to say:** "For complex reporting, we implemented a data transposition feature that pivots rows into columns for easier analytical reading."
*   **How to show:** Navigate to the **Analytics > Sales Performance** or **Cross-Tab** view in the UI. Show the table where dealers/months are dynamically generated as columns instead of standard rows.

### Transient Variables
*   **What to say:** "We utilized `@Transient` variables in our entities to compute dynamic fields on the fly without storing redundant data in the database."
*   **How to show:** Show an entity (like `ServiceOrder` or `Inventory`). Point out a `@Transient` field (e.g., `totalCost` calculated from parts + labor, or `stockHealth` based on quantity). Show how this field is returned in the API but doesn't exist as a DB column.

### Unit Testing (JUnit/Mockito)
*   **What to say:** "We established a robust testing foundation using JUnit 5 and Mockito to ensure business logic remains intact during refactoring."
*   **How to show:** Open your IDE and run the test suite. Show the green checkmarks. Briefly open a test class (like `AuthServiceImplTest` or `InventoryServiceImplTest`) to show how you mock the repository and verify the service logic.

---

## 3. Files & Visualization (5 mins)

### Multipart File Upload, Download, and Size Restrictions
*   **What to say:** "We built a centralized Document Management System. It handles multipart file uploads for car images, KYC docs, and invoices, complete with size and type validations."
*   **How to show:** Go to **Inventory** or **Leads**. Click the 📄 **View Documents** icon. Upload a PDF or Image. Show the progress bar and success message. Try uploading a massive file (e.g., >10MB) to show the Spring Boot `MaxUploadSizeExceededException` being handled gracefully.

### Image Compression
*   **What to say:** "To save storage space and bandwidth, images are automatically compressed on the backend before being saved to the server."
*   **How to show:** Upload a large, high-res image (e.g., 5MB). Then, check the actual saved file size on the server (`uploads/INVENTORY/...`) or the Network tab during download to prove it was compressed to a fraction of the original size.

### Dashboard Using Charting Library (ApexCharts/Recharts)
*   **What to say:** "We transformed raw data into actionable insights using an interactive Analytics Dashboard."
*   **How to show:** Navigate to the **Dashboard** or **Analytics** page. Hover over the Bar charts (Sales per Dealer), Line charts (Revenue over time), and Pie charts (Lead Status distribution). Show that the tooltips and legends are fully interactive.

---

## 4. Architecture & Performance (3 mins)

### Multi-Module Architecture
*   **What to say:** "We refactored the monolith into a Maven Multi-Module project, separating concerns to allow for independent scaling and cleaner dependency management."
*   **How to show:** Open your `pom.xml`. Show the `<modules>` section. Expand your project tree to show the physical separation of `DealerPro_core` (Entities), `DealerPro_service` (Business Logic), and `DealerPro_api` (Controllers).

### Environment Configuration via Profiles
*   **What to say:** "We utilized Spring Profiles to seamlessly switch between local, testing, and production environments."
*   **How to show:** Open `application.properties`, `application-mysql.properties`, and `application-sqlite.properties`. Show how you can switch the database from SQLite to MySQL simply by changing the active profile (`spring.profiles.active=mysql`).

### Internal Caching
*   **What to say:** "To dramatically improve response times for frequently accessed, rarely changing data, we implemented internal caching."
*   **How to show:** Show the `@Cacheable` annotation on a method like `getKiaCars()` or `getAllDealers()`. Mention that the first API call hits the database, but subsequent calls are served instantly from memory, reducing DB load.

---

## Conclusion
*   **What to say:** "Phase 2 has transformed DealerPro from a functional CRUD app into a secure, performant, and enterprise-ready platform. Thank you, and I am open to any questions."
