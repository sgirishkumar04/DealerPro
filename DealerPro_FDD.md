# Functional Design Document (FDD)

## DealerPro - Dealer Management System

**Document Version:** 1.0
**Date:** April 9, 2026
**Prepared By:** DealerPro Development Team
**Project Sponsor:** KIA Motors Management
**Reference:** DealerPro Business Requirements Document (BRD) v1.0

---

## Table of Contents

1. Introduction and Purpose
2. System Overview
3. User Roles and Access Control
4. Module Functional Specifications
   - 4.1 Authentication and Session Management
   - 4.2 Dashboard
   - 4.3 Admin Panel and User Management
   - 4.4 Dealer Management
   - 4.5 Vehicle Inventory Management
   - 4.6 Sales Order Management
   - 4.7 Service Management
   - 4.8 Lead Management
   - 4.9 Test Drive Management
   - 4.10 Parts Inventory Management
   - 4.11 Purchase Order Management
   - 4.12 Finance Management
   - 4.13 Analytics and Reporting
   - 4.14 Audit Log Management
5. Business Process Workflows
6. User Interface Design
7. Data Requirements
8. Integrations and Reporting
9. Security Requirements
10. Error Handling and Validations
11. Appendix

---

## 1. Introduction and Purpose

### 1.1 Document Purpose

This Functional Design Document (FDD) serves as the definitive functional specification for DealerPro, a comprehensive web-based Dealer Management System developed for KIA Motors. It translates the business requirements defined in the BRD into precise, actionable descriptions of system behavior, user interactions, screen layouts, data flows, and validation rules. This document is intended for use by frontend developers, backend engineers, QA engineers, and business stakeholders to ensure a shared understanding of what the system must do before and during implementation.

This document describes what the system does, not how it is technically implemented. Technical implementation details are addressed in separate technical design documents.

### 1.2 Project Scope

DealerPro provides a unified, browser-accessible platform to manage the complete operational lifecycle of KIA automobile dealerships. The in-scope areas are:

- Role-based user authentication and session management
- Admin panel for system-level user and dealership administration
- Vehicle inventory management linked to the KIA catalog
- Sales order processing from creation to completion
- Service appointment scheduling and tracking
- Customer lead capture and pipeline management
- Test drive scheduling linked to leads
- Spare parts inventory management and restocking via purchase orders
- Financial transaction recording and summaries
- Analytics dashboards and on-demand reporting
- Comprehensive audit logging of all system activities

The following are explicitly out of scope for this release: mobile native applications, external payment gateway integration, a customer-facing portal, third-party CRM integration, and automated marketing campaigns.

### 1.3 Objectives of the FDD

- Provide a complete description of every system module, screen, and workflow
- Define all input fields, validations, and business rules for each function
- Serve as the primary reference for QA test case creation
- Prevent scope creep by establishing a clear, agreed-upon functional baseline
- Enable developer teams to build against a stable functional specification

---

## 2. System Overview

### 2.1 Application Architecture

DealerPro is a full-stack Single Page Application (SPA) organized as follows:

- **Frontend:** React 19 with TypeScript, Material UI components, React Query for server state, and Vite as the build tool. The application renders all content within a persistent shell layout without full-page reloads.
- **Backend:** Spring Boot 3 REST API using Spring Security for authentication and authorization, Spring Data JPA with Hibernate for ORM, and structured around a modular package design (`com.kia.dms.modules.*`).
- **Database:** MySQL for production environments; SQLite supported in development. All entities extend a shared `BaseEntity` providing auto-managed `id`, `createdAt`, `updatedAt`, and `isDeleted` fields.
- **Authentication:** JWT (JSON Web Token) based stateless authentication. Tokens are issued on login, carry role claims, and expire after 30 minutes.

### 2.2 Module Summary

| Module | Accessible By | Core Function |
|--------|--------------|---------------|
| Authentication | All users | Login, logout, session control |
| Dashboard | All users | Role-scoped KPI summary and navigation |
| Admin Panel | Admin only | Manage all users, dealers, system config |
| Dealer Management | Admin, Manager | CRUD operations on dealership records |
| Vehicle Inventory | Admin, Manager, Dealer | Vehicle stock tracking linked to KIA catalog |
| Sales Orders | Admin, Manager, Dealer | End-to-end sales order lifecycle |
| Service Management | Admin, Manager, Dealer | Service appointment scheduling and completion |
| Lead Management | Admin, Manager, Dealer | Sales funnel from lead capture to conversion |
| Test Drives | Admin, Manager, Dealer | Schedule and complete test drive appointments |
| Parts Inventory | Admin, Manager, Dealer | Spare parts catalog and stock management |
| Purchase Orders | Admin, Manager, Dealer | Parts restocking via supplier purchase orders |
| Finance | Admin, Manager | Transaction ledger and revenue summaries |
| Analytics | Admin, Manager | Visual performance dashboards |
| Audit Logs | Admin only | Full change history of all system operations |

---

## 3. User Roles and Access Control

### 3.1 Role Definitions

DealerPro enforces three distinct user roles. Each role carries a specific scope of data access and operational permissions. Role-based restrictions are enforced at both the frontend (route guards and conditional rendering) and the backend (Spring Security method-level annotations and service-layer filtering).

**Admin**
The Admin role represents the highest privilege level in the system. An Admin has unrestricted access to all modules, all dealerships, and all user accounts. Admins are responsible for system configuration, user onboarding, and platform-wide governance. There is no dealership assignment for Admin users; they see and operate across the entire system.

**Manager**
The Manager role is intended for regional or area managers overseeing one or more dealerships. A Manager is assigned to one or more specific dealerships and can only view and operate data belonging to those dealerships. Managers can view analytics, finance summaries, and manage users within their assigned dealerships. They cannot access admin-level configuration or global audit trails.

**Dealer**
The Dealer role represents individual dealership staff members. A Dealer is assigned to exactly one dealership and can only access data belonging to that dealership. Dealers handle daily operations: adding stock, creating orders, scheduling service, capturing leads, and scheduling test drives. They do not have access to financial reports, analytics, or user management functions.

### 3.2 Permission Matrix

| Feature / Module | Admin | Manager | Dealer |
|-----------------|-------|---------|--------|
| Login and Logout | Yes | Yes | Yes |
| Dashboard | Yes (all dealers) | Yes (assigned dealers) | Yes (own dealer) |
| Admin Panel | Yes | No | No |
| User Management | Yes | No | No |
| Dealer Management | Yes | View Only | No |
| Vehicle Inventory | Yes | Yes | Yes (own dealer) |
| Sales Orders | Yes | Yes | Yes (own dealer) |
| Service Management | Yes | Yes | Yes (own dealer) |
| Lead Management | Yes | Yes | Yes (own dealer) |
| Test Drives | Yes | Yes | Yes (own dealer) |
| Parts Inventory | Yes | Yes | Yes (own dealer) |
| Purchase Orders | Yes | Yes | Yes (own dealer) |
| Finance Reports | Yes | Yes | No |
| Analytics | Yes | Yes | No |
| Audit Logs | Yes | No | No |

---

## 4. Module Functional Specifications

### 4.1 Authentication and Session Management

#### 4.1.1 Purpose

The Authentication module controls all aspects of system access, including login, session maintenance, and logout. No system functionality is accessible without a valid authenticated session.

#### 4.1.2 Login Screen

The login screen is displayed at the application root URL and is the only page accessible to unauthenticated users. All other routes redirect to the login screen if no valid session exists.

**Input Fields:**

| Field | Type | Validation Rules |
|-------|------|-----------------|
| Username | Text input | Required. Minimum 3 characters. |
| Password | Password input (masked) | Required. Minimum 8 characters. |

**System Behavior:**
- On form submission, the entered credentials are sent to the backend authentication endpoint via a POST request.
- Upon successful authentication, the backend returns a signed JWT access token containing the user's identity and role.
- The token is stored in application state and browser local storage to persist across page refreshes.
- The user is redirected to their role-appropriate dashboard immediately after login.
- If the credentials are invalid, an inline error message is displayed below the form: "Invalid username or password. Please try again." The password field is cleared but the username is retained.
- After five consecutive failed login attempts for the same account, the account is locked for 5 minutes. A message is displayed informing the user of the lockout duration.
- A "Forgot Password" link is displayed but is reserved for a future release.

**Session Rules:**
- JWT tokens expire after 30 minutes of inactivity. When a token expires, the next API call returns a 401 status, which triggers automatic redirection to the login screen with the message: "Your session has expired. Please sign in again."
- Tokens are refreshed on active API usage, effectively extending the session while the user is active.

#### 4.1.3 Logout

- A logout button is always visible in the top navigation bar for all authenticated users.
- Clicking logout clears the JWT token from application state and local storage.
- The user is redirected to the login screen immediately.
- Any unsaved form data is discarded on logout.

---

### 4.2 Dashboard

#### 4.2.1 Purpose

The Dashboard is the default landing page for all authenticated users after login. It presents a role-scoped at-a-glance summary of the system's key operational metrics and provides quick-access navigation to all accessible modules.

#### 4.2.2 KPI Summary Cards

The following KPI cards are displayed at the top of the dashboard. Data is scoped to the logged-in user's accessible dealerships (all for Admin, assigned for Manager, own for Dealer).

| KPI Card | Metric Displayed | Additional Detail |
|----------|-----------------|-------------------|
| Total Orders | Count of all sales orders | Breakdown: Pending / Confirmed / Completed |
| Total Revenue | Sum of completed order values | Currency formatted |
| Available Inventory | Count of vehicles with status "Available" | Linked to Inventory module |
| Active Leads | Count of leads with status New or Contacted | Linked to Lead module |
| Service Appointments | Count of Scheduled and In Progress appointments | Linked to Service module |
| Test Drives | Count of upcoming Pending test drives | Linked to Test Drive module |

#### 4.2.3 Module Navigation

Below the KPI cards, the dashboard displays a grid of navigation tiles for each module the logged-in user can access, based on the permission matrix. Each tile shows the module name and an icon. Clicking a tile navigates to the corresponding module.

---

### 4.3 Admin Panel and User Management

#### 4.3.1 Purpose

The Admin Panel is the system administration hub, accessible exclusively by users with the Admin role. It provides complete control over user accounts, role assignments, and dealership associations across the entire system.

#### 4.3.2 User List Screen

The Admin Panel displays a paginated data grid of all registered users in the system.

**Grid Columns:** User ID, Full Name, Username, Email, Role (Admin / Manager / Dealer), Assigned Dealership, Account Status (Active / Locked), Created Date, Actions.

**Toolbar Actions:** Add New User, Search by name or username, Filter by Role, Filter by Status.

#### 4.3.3 Create / Edit User Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| First Name | Text | Required, max 50 characters |
| Last Name | Text | Required, max 50 characters |
| Username | Text | Required, unique across system, min 3 characters |
| Email Address | Email | Required, unique, valid email format |
| Password | Password | Required on Create. Min 8 characters, must include uppercase, lowercase, and number |
| Role | Dropdown (Admin, Manager, Dealer) | Required |
| Assigned Dealership | Dropdown (active dealers) | Required only when Role is Dealer |
| Account Status | Toggle (Active / Inactive) | Default: Active |

**System Behavior:**
- When the Role field is set to "Dealer", the Assigned Dealership field becomes visible and mandatory.
- When Role is "Admin" or "Manager", the Assigned Dealership field is hidden.
- Submitting with a duplicate username or email shows a conflict error: "A user with this username or email already exists."
- On successful creation, the user record is saved and the list refreshes.
- Passwords are never stored in plain text; they are hashed using BCrypt on the backend before persistence.

**Business Rules:**
- Each user must have a unique username and email.
- A Dealer-role user must be linked to exactly one dealership.
- An Admin can deactivate any user account. Deactivated accounts cannot log in.
- Admin accounts cannot be self-deactivated.

---

### 4.4 Dealer Management

#### 4.4.1 Purpose

The Dealer Management module enables Admins to create and administer dealership records. Managers can view the dealerships they are assigned to. A dealership record is the primary organizational unit to which all operational data (inventory, orders, services, leads, etc.) is scoped.

#### 4.4.2 Dealer List Screen

**Grid Columns:** Dealer ID, Dealership Name, Location, Contact Number, Email, Assigned Manager, Status, Created Date, Actions.

**Toolbar Actions:** Add New Dealer (Admin only), Search by name or location, Filter by Status.

#### 4.4.3 Create / Edit Dealer Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Dealership Name | Text | Required, unique, max 150 characters |
| Location / Address | Text | Required, max 255 characters |
| Contact Number | Text | Required, valid numeric phone format, max 20 characters |
| Email Address | Email | Required, valid email format, max 100 characters |
| Assigned Manager | Dropdown (users with Manager role) | Required |
| Status | Dropdown (Active / Inactive) | Default: Active |

**System Behavior:**
- Dealership names must be unique. Submitting a duplicate name shows a validation error.
- An assigned manager can be changed at any time by an Admin.
- Deactivating a dealership sets its status to Inactive. All associated operational records remain intact and accessible in read-only mode; new records cannot be created against an inactive dealership.

**Business Rules:**
- Only Admin users can create or delete dealership records.
- Each dealership must have one assigned manager at all times.
- Deletion of a dealership is a soft delete; the record is marked `isDeleted = true` and excluded from active views.

---

### 4.5 Vehicle Inventory Management

#### 4.5.1 Purpose

The Inventory module manages the stock of physical vehicles held by each dealership. Vehicles are defined using the KIA car catalog (`kia_cars` table) as the master reference for model, variant, color, category, and base price. Inventory records track quantity, current status, and dealership assignment.

#### 4.5.2 Inventory List Screen

**Grid Columns:** ID, Vehicle (Model + Variant + Color), Category, Fuel Type, Price, Quantity, Status, Dealership, Manager, Created Date, Actions.

**Toolbar Actions:** Add Vehicle, Export, Filter panel (Status, Category, Dealership), Search by model name.

**Status Chips:** Available (green), Reserved (yellow/amber), Sold (purple). Deleted records are excluded from the grid by default.

#### 4.5.3 Add / Edit Vehicle (Inventory Entry) Form

Inventory entries are linked to the KIA catalog. The form uses a KIA car selector to choose a pre-defined model configuration.

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| KIA Car Model | Dropdown (from `kia_cars` catalog) | Required. Displays: Model + Variant + Color |
| Quantity | Number input | Required. Minimum value: 1 |
| Status | Dropdown (Available, Reserved) | Required. Default: Available |
| Dealership | Dropdown (active dealers) | Required. Auto-set to own dealer for Dealer role |
| Manager | Dropdown (managers of selected dealer) | Optional for admin-level assignment |

**System Behavior:**
- The Price field is auto-populated and read-only, pulled from the selected KIA car's catalog price.
- Category and Fuel Type are also auto-populated from the selected KIA car record and displayed for reference.
- A Dealer-role user cannot change the Dealership field; it is locked to their assigned dealership.
- Sold vehicles are displayed in the grid as read-only. The Edit action is disabled for Sold entries.
- Soft-deleted inventory records are excluded from all active views but retained in the database for historical traceability.

**Business Rules:**
- Each inventory item is linked to one KIA car record and one dealership.
- Vehicle status values: Available, Reserved, Sold.
- Only vehicles with status "Available" can be selected when creating a new sales order.
- When a sales order is marked Completed, the linked inventory record's status is automatically updated to "Sold" by the system.
- Vehicle pricing must be a positive decimal value; it is inherited from the KIA catalog unless overridden.
- Deletion is always soft delete (`isDeleted = true`).

---

### 4.6 Sales Order Management

#### 4.6.1 Purpose

The Sales Order module manages the complete lifecycle of vehicle sales transactions. Each order captures the purchasing customer's details, the vehicle being purchased, quantity, pricing, and payment information. The order progresses through a defined status workflow from creation through confirmation and final completion.

#### 4.6.2 Sales Order List Screen

**Grid Columns:** Order ID, Vehicle (Name + Model), Dealer Name, Quantity, Total Price, Status, Manager, Created Date, Actions.

**Toolbar Actions:** Create Order, Export, Filter by Status, Filter by Dealer, Date range picker.

**Status Chips:** Pending (blue), Confirmed (orange), Completed (purple), Cancelled (red/grey).

#### 4.6.3 Create / Edit Order Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Vehicle | Dropdown (Available inventory items) | Required. Displays Model + Variant + Color |
| Quantity | Number input | Required. Must be >= 1 and <= available stock |
| Total Price | Currency (auto-calculated) | Read-only. Computed as Quantity x Vehicle Unit Price |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Manager | Dropdown (managers of selected dealer) | Optional |
| Status | Dropdown (Pending, Confirmed, Completed, Cancelled) | Default: Pending on creation |

**System Behavior:**
- The Vehicle dropdown lists only inventory entries with status "Available" within the accessible dealerships of the logged-in user.
- Total Price is calculated automatically when Quantity changes and is displayed in real time; it is not editable by the user.
- When the order status is changed to "Completed", the system automatically updates the linked inventory item's status to "Sold". This is a backend-enforced operation and is not reversible.
- Completed orders are locked; all fields become read-only and no further status changes are permitted.
- A cancelled order does not affect the linked vehicle's inventory status.
- Manager assignment can be used to associate an order with the responsible manager for reporting purposes.

#### 4.6.4 Order Status Workflow

```
[Pending] --> [Confirmed] --> [Completed]
     |
     v
[Cancelled]
```

Status transitions are user-initiated via the Edit form or an inline status action. The only automated transition is the inventory status update triggered upon reaching Completed.

**Business Rules:**
- Each order is linked to exactly one vehicle inventory record and one dealership.
- Total price (stored as `total_price` in the `orders` table) must be a positive decimal value.
- Completed orders cannot be edited, status-changed, or cancelled.
- Cancelled orders are retained as historical records and cannot be reactivated.

---

### 4.7 Service Management

#### 4.7.1 Purpose

The Service module manages vehicle service appointments for customers at each dealership. It covers scheduling, status tracking, and completion recording for all service types including maintenance, repair, and inspection.

#### 4.7.2 Service Order List Screen

**Grid Columns:** Service ID, Vehicle (Name + Model), Dealer Name, Description, Status, Manager, Created Date, Actions.

**Toolbar Actions:** Add Service Order, Export, Filter by Status, Filter by Dealer.

**Status Chips:** Pending (blue), In Progress (orange), Completed (purple), Cancelled (grey).

#### 4.7.3 Create / Edit Service Order Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Vehicle | Dropdown (vehicles linked to accessible inventory) | Required |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Description | Textarea | Required. Describes the service to be performed |
| Status | Dropdown (Pending, In Progress, Completed, Cancelled) | Default: Pending |
| Manager | Dropdown (managers of selected dealer) | Optional |

**System Behavior:**
- The Vehicle dropdown draws from all vehicles associated with the selected dealership's inventory.
- When status is set to Completed, the record is thereafter locked and no further modifications are allowed.
- The description field (stored as TEXT in `service_orders`) allows rich, multi-line service notes.
- The vehicle name and dealer name are exposed as display-only computed fields (`vehicleName`, `dealerName`) in the list grid.

#### 4.7.4 Service Status Workflow

```
[Pending] --> [In Progress] --> [Completed]
     |
     v
[Cancelled]
```

**Business Rules:**
- Each service order must reference exactly one vehicle and one dealership.
- Service descriptions are mandatory and must clearly state the nature of the service.
- Completed service orders cannot be edited, rescheduled, or cancelled.
- Manager is derived from the associated dealer entity if not explicitly assigned.

---

### 4.8 Lead Management

#### 4.8.1 Purpose

The Lead Management module captures and tracks prospective customer inquiries through the sales pipeline. Leads represent potential buyers who have expressed interest in a KIA vehicle. The module enables dealership staff to record initial contact, track the lead's progress through qualification stages, and ultimately convert a qualified lead into a sales order.

#### 4.8.2 Lead List Screen

**Grid Columns:** Lead ID, Full Name (First + Last), Email, Phone, Vehicle Interest, Status, Dealership, Created Date, Actions.

**Toolbar Actions:** Add Lead, Export, Filter by Status, Filter by Dealer, Search by name or email.

**Status Chips:** New (green), Contacted (blue), Qualified (orange), Converted (purple), Lost (red/grey).

#### 4.8.3 Create / Edit Lead Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| First Name | Text | Required, max 50 characters |
| Last Name | Text | Required, max 50 characters |
| Email | Email | Optional (at least one of Email or Phone required) |
| Phone | Text | Optional (at least one of Email or Phone required), max 20 characters |
| Vehicle Interest (Free Text) | Text | Optional. Describes the customer's general interest |
| KIA Car Interest | Dropdown (KIA catalog) | Optional. Links to specific KIA car model |
| Status | Dropdown (New, Contacted, Qualified, Converted, Lost) | Required. Default: New |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Notes | Textarea | Optional. Free-text notes on interaction history |

**System Behavior:**
- At least one of Email or Phone must be provided. Submitting without either shows the error: "Please provide at least one contact method."
- Leads with status Converted or Lost are rendered as read-only. The Edit action remains available only to change notes; status cannot be reversed from Converted or Lost.
- A "Convert to Order" action button is available on Qualified leads. Clicking it pre-populates a new Sales Order form with the lead's name and dealership and navigates the user to the Sales module to complete the order.

**Business Rules:**
- Lead status must be one of: New, Contacted, Qualified, Converted, Lost.
- Once a lead is marked Converted, it must be linked to a sales order.
- Converted and Lost leads cannot have their status changed to any earlier stage.
- Manager is derived from the associated dealer entity.

---

### 4.9 Test Drive Management

#### 4.9.1 Purpose

The Test Drive module enables dealership staff to schedule, manage, and record the outcomes of vehicle test drives. Each test drive is linked to an active customer lead, ensuring test drives are always part of the sales engagement lifecycle.

#### 4.9.2 Test Drive List Screen

**Grid Columns:** Test Drive ID, Lead (Customer Name), Vehicle (Name + Model), Scheduled Date & Time, Status, Dealership, Created Date, Actions.

**Toolbar Actions:** Schedule Test Drive, Export, Filter by Status, Filter by Dealer.

**Status Chips:** Pending (blue), Completed (purple), Cancelled (grey).

#### 4.9.3 Schedule / Edit Test Drive Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Lead | Dropdown (active leads: New, Contacted, Qualified) | Required |
| Vehicle | Dropdown (Available inventory) | Required |
| Scheduled Date and Time | DateTime picker | Required. Must be a future date and time |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Status | Dropdown (Pending, Completed, Cancelled) | Default: Pending |

**System Behavior:**
- The Lead dropdown displays active leads (status: New, Contacted, Qualified) within the user's accessible dealerships.
- The Vehicle dropdown is filtered to inventory items with status "Available" within the same dealership.
- Scheduled date and time are stored as a combined `scheduled_at` (LocalDateTime) field in the `test_drives` table.
- Completed test drives are read-only. Cancelled test drives are retained as historical records.

**Business Rules:**
- Test drives must be linked to an active lead.
- Only Available vehicles may be selected for a test drive.
- A cancelled test drive does not affect the linked lead's status or the vehicle's inventory status.
- Manager is derived from the associated dealer entity.

---

### 4.10 Parts Inventory Management

#### 4.10.1 Purpose

The Parts module manages the catalog of spare parts and consumables maintained by each dealership. It tracks stock levels, unit pricing, and supplier information, enabling staff to monitor availability and identify when restocking is required.

#### 4.10.2 Parts List Screen

**Grid Columns:** Part ID, Part Name, Price, Stock Quantity, Supplier, Dealership, Manager, Status, Created Date, Actions.

**Toolbar Actions:** Add Part, Export, Filter by Status, Filter by Dealer, Search by part name or supplier.

**Status Chips:** Active (green), Inactive (grey). Low stock can be visually indicated via a badge when stock falls below a defined threshold.

#### 4.10.3 Add / Edit Part Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Part Name | Text | Required, max 100 characters |
| Price (Unit) | Currency | Required. Must be a positive decimal value |
| Stock Quantity | Number | Required. Minimum value: 0 |
| Supplier | Text | Optional. Max 100 characters |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Manager | Dropdown | Optional |
| Status | Dropdown (Active, Inactive) | Default: Active |

**Business Rules:**
- Stock quantity cannot be negative.
- Price must be a positive decimal value (stored with precision 10, scale 2).
- Deactivating a part (Status: Inactive) marks it as unavailable but retains the record.
- Deletion is a soft delete via the `isDeleted` flag inherited from `BaseEntity`.

---

### 4.11 Purchase Order Management

#### 4.11.1 Purpose

The Purchase Order module facilitates the restocking of spare parts. When a part's stock is low, staff can create a purchase order to request a specific quantity from a supplier. The module tracks the order's quantity, total cost, and business justification.

#### 4.11.2 Purchase Order List Screen

**Grid Columns:** PO ID, Part Name, Quantity Ordered, Total Cost, Justification, Dealership, Manager, Status (if applicable), Created Date, Actions.

**Toolbar Actions:** Create Purchase Order, Export, Filter by Dealer.

#### 4.11.3 Create Purchase Order Form

**Input Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Part | Dropdown (active parts from accessible dealers) | Required |
| Quantity | Number | Required. Minimum value: 1 |
| Total Cost | Currency (auto-calculated) | Auto-calculated as Quantity x Part Unit Price |
| Justification | Text | Required. Business reason for the order, max 255 characters |
| Dealership | Dropdown | Required. Auto-set for Dealer role |
| Manager | Dropdown | Optional |

**System Behavior:**
- Total Cost is automatically calculated as the ordered Quantity multiplied by the selected Part's unit price.
- The Justification field is mandatory and must clearly state the reason for the purchase request (e.g., "Low stock replenishment for brake pads").
- Upon receiving parts outside the system, staff manually update the linked part's stock quantity in the Parts module.

**Business Rules:**
- Each purchase order must reference exactly one part record.
- Quantity must be at least 1.
- Total cost is stored with precision 12, scale 2 in the `purchase_orders` table.

---

### 4.12 Finance Management

#### 4.12.1 Purpose

The Finance module provides a consolidated, read-only view of all financial transactions generated by the system. Transactions are automatically created when sales orders or service orders are completed. The module gives Admins and Managers a clear picture of revenue flow across dealerships.

#### 4.12.2 Transaction List Screen

**Grid Columns:** Transaction ID, Dealer Name, Amount, Type, Description, Manager, Created Date.

**Toolbar Actions:** Export, Filter by Type, Filter by Dealer, Date range picker.

**Access Restriction:** This module is accessible to Admin and Manager roles only. Dealer-role users do not have access to the Finance module.

#### 4.12.3 Transaction Record Structure

Transactions are system-generated and cannot be manually created, edited, or deleted by any user. Every transaction record contains:

| Field | Source |
|-------|--------|
| Dealer | Linked dealership entity |
| Amount | Order total price or service cost (BigDecimal, precision 12, scale 2) |
| Type | "SALES" for order completions, "SERVICE" for service completions |
| Description | Auto-generated narrative (e.g., "Sales Order #45 completed") |
| Manager | Manager associated with the dealer |

#### 4.12.4 Financial Summary Panel

A summary panel at the top of the Finance module displays:
- Total Revenue for the selected period
- Sales Revenue vs. Service Revenue split
- Revenue by Dealership (bar breakdown for Admin/Manager)
- Number of transactions in the period

**Business Rules:**
- Transactions are immutable; they cannot be edited or deleted by any user or role.
- Each transaction must reference a valid dealership.
- Transaction records are retained for a minimum of 7 years in compliance with financial record-keeping requirements.
- Manager is derived from the dealer entity for scoping and reporting purposes.

---

### 4.13 Analytics and Reporting

#### 4.13.1 Purpose

The Analytics module provides visual performance dashboards and on-demand reports for strategic decision-making. It is accessible to Admin and Manager roles and presents data scoped to their respective dealership access.

#### 4.13.2 Dashboard Panels

| Panel | Visualization | Data Source |
|-------|--------------|-------------|
| Sales Performance Trend | Line chart (monthly/weekly) | Sales orders by completion date |
| Revenue by Dealership | Grouped bar chart | Transactions grouped by dealer |
| Inventory Status Breakdown | Donut chart | Vehicle status distribution |
| Lead Funnel | Funnel chart | Lead count by status stage |
| Service Type Distribution | Pie chart | Service orders by description category |
| Top KIA Models Sold | Horizontal bar chart | Completed orders grouped by vehicle model |

#### 4.13.3 Standard Reports

| Report | Available Filters | Contents |
|--------|------------------|----------|
| Sales Performance Report | Date range, Dealership | Order counts, revenue, model breakdown |
| Inventory Status Report | Dealership, Status | Stock levels, availability, KIA model list |
| Service Summary Report | Date range, Dealership | Appointment counts, status distribution |
| Lead Conversion Report | Date range, Dealership | Conversion rate, stage breakdown, source |
| Financial Revenue Report | Date range, Dealership | Revenue totals, type split, transaction counts |
| Audit Activity Report | Date range, User, Entity | Change history, action types, event counts |

All reports support export to PDF and Excel (XLSX) formats. A date range selection is mandatory before initiating an export.

---

### 4.14 Audit Log Management

#### 4.14.1 Purpose

The Audit Log module provides a tamper-proof, searchable historical record of all create, update, and delete operations performed across every module in the system. It is accessible only by Admin users and serves as the primary tool for compliance, accountability, and incident investigation.

#### 4.14.2 Audit Log List Screen

**Grid Columns:** Log ID, Timestamp, Acting User, Action (CREATE / UPDATE / DELETE), Entity Type (e.g., Order, Vehicle, Lead), Entity ID, Description, IP Address.

**Toolbar Actions:** Filter by User, Filter by Action Type, Filter by Entity Type, Date range picker.

**System Behavior:**
- Audit log entries are automatically generated by the backend for every create, update, and delete operation on any entity.
- Entries are read-only and cannot be modified or deleted by any user, including Admin.
- The description field provides a human-readable summary of the change (e.g., "Order #42 status changed from Pending to Completed by user john.doe").

**Business Rules:**
- Audit logs are generated for all module data mutations.
- Logs capture: acting user, timestamp, action type, entity type, entity ID, and narrative description.
- Audit logs are retained for a minimum of 2 years.
- Only Admin role users can view audit logs.

---

## 5. Business Process Workflows

### 5.1 End-to-End Vehicle Sales Workflow

This workflow describes the complete journey from initial customer interest to a finalized vehicle sale.

```
Step 1:  Dealer captures a customer inquiry as a new Lead record.
Step 2:  Dealer updates Lead status to "Contacted" after initial communication.
Step 3:  Dealer schedules a Test Drive linked to the Lead (optional but recommended).
Step 4:  Test Drive is conducted; Dealer marks the Test Drive as "Completed".
Step 5:  Dealer updates Lead status to "Qualified" after the test drive.
Step 6:  Dealer clicks "Convert to Order" on the Qualified Lead.
Step 7:  System pre-populates a new Sales Order form with the customer's details.
Step 8:  Dealer selects the vehicle (Available status), confirms quantity and price.
Step 9:  System auto-calculates Total Price. Dealer submits the order (status: Pending).
Step 10: Manager or Admin reviews and changes order status to "Confirmed".
Step 11: Payment is received. Dealer or Manager marks the order as "Completed".
Step 12: System automatically updates vehicle inventory status to "Sold".
Step 13: System auto-generates a Finance Transaction record for the completed order.
Step 14: Lead status is updated to "Converted".
Step 15: Audit log entries are created for all state changes throughout the workflow.
```

### 5.2 Service Appointment Workflow

```
Step 1:  Dealer creates a Service Order, selecting a vehicle and entering a description.
Step 2:  System saves the Service Order with status: Pending.
Step 3:  When the service begins, Dealer updates status to "In Progress".
Step 4:  Upon completion, Dealer updates status to "Completed".
Step 5:  Service Order is locked; no further edits are permitted.
Step 6:  A Finance Transaction of type "SERVICE" is auto-created by the system.
Step 7:  Audit log records the completion event.
```

### 5.3 Parts Restocking Workflow

```
Step 1:  Dealer notices a part's stock is low (visual indicator on the Parts grid).
Step 2:  Dealer creates a Purchase Order for the part, entering quantity and justification.
Step 3:  System calculates Total Cost based on part price x quantity.
Step 4:  Purchase Order is submitted and saved as a record.
Step 5:  When the physical parts are received, Dealer manually edits the Part record
         and increments the Stock Quantity by the delivered amount.
Step 6:  The low-stock visual indicator is cleared once stock meets the threshold.
```

### 5.4 New User Onboarding Workflow

```
Step 1:  Admin navigates to the Admin Panel and selects "Add New User".
Step 2:  Admin enters user details: name, username, email, password, and role.
Step 3:  If role is "Dealer", Admin selects the specific dealership to assign.
Step 4:  Admin saves the record. The user account is created and active.
Step 5:  Admin communicates the credentials to the new user.
Step 6:  New user logs in with the provided credentials.
Step 7:  User is redirected to the role-appropriate dashboard.
Step 8:  Audit log records the user creation event.
```

---

## 6. User Interface Design

### 6.1 Application Shell Layout

The application uses a consistent, persistent shell layout across all authenticated pages:

- **Top Navigation Bar:** Displays the DealerPro logo, the current module name, global search (where applicable), a notifications icon, and the user profile menu (showing username and role) with a logout option.
- **Left Sidebar:** A collapsible navigation panel listing all modules the logged-in user can access, with an icon and label per module. The active module is visually highlighted. The sidebar can be collapsed to icon-only mode to maximize the content area.
- **Main Content Area:** The primary region where module content renders. It fills the remaining viewport space and contains the toolbar, data grid or form, and any summary panels.
- **Module Toolbar:** Positioned at the top-right of the Main Content Area within each module, containing primary actions such as "Add New", "Export", and filter controls.

### 6.2 Common UI Patterns

| Pattern | Application |
|---------|-------------|
| Paginated Data Grid | All list views across every module |
| Modal Dialog (form) | Create and Edit operations |
| Sliding Drawer (form) | Alternative for wide forms requiring more context |
| Status Badge Chip | Inline status representation on grid rows, color-coded |
| Confirmation Dialog | Destructive or irreversible actions (delete, mark completed, cancel) |
| Inline Field Validation | Real-time error display beneath each form field on blur or submit |
| Toast Notification | Non-blocking success, error, and warning feedback after actions |
| Skeleton Loader | Displayed in place of grid rows while data is loading |
| Empty State Illustration | Shown when a module has no records matching the current filters |

### 6.3 Status Color Reference

| Status Value | Color Applied |
|-------------|---------------|
| Available / Active / New | Green |
| Pending / Scheduled / Contacted | Blue |
| In Progress / Qualified | Orange / Amber |
| Completed / Converted / Sold | Purple |
| Reserved | Yellow |
| Cancelled / Lost / Inactive | Red or Grey |

### 6.4 Responsive Design Targets

- **Desktop (1280px and above):** Full sidebar expanded. Two-column form layouts. Full-width data grids.
- **Tablet (768px to 1279px):** Sidebar collapses to icon-only. Single-column form layout. Horizontal grid scrolling as needed.
- Screens below 768px are not a primary target for this release but must not cause visual breakage.

---

## 7. Data Requirements

### 7.1 Database Entities and Key Fields

All entities (except `KiaCarEntity`) extend `BaseEntity`, which provides: `id` (Long, auto-generated primary key), `createdAt` (LocalDateTime), `updatedAt` (LocalDateTime), and `isDeleted` (Boolean, default false).

**users** - Stores all user accounts.
Fields: id, username (unique), email (unique), password (BCrypt hash), first_name, last_name, is_active, role (FK to roles), created_at, updated_at, is_deleted.

**roles** - Lookup table for user role definitions.
Fields: id, role_name (ADMIN, MANAGER, DEALER).

**admin_profiles** - Extended profile data for Admin-role users.
Fields: id, user_id (FK), created_at, updated_at.

**manager_profiles** - Extended profile data for Manager-role users.
Fields: id, user_id (FK), created_at, updated_at.

**dealers** - Represents a KIA dealership location.
Fields: id, name (unique, max 150), location (max 255), contact_number (max 20), email (max 100), status (max 50), manager_id (FK to manager_profiles), created_at, updated_at, is_deleted.

**kia_cars** - Master vehicle catalog maintained by KIA. Not soft-deleted.
Fields: id, model_name (max 100, not null), variant (max 100, not null), color (max 60, not null), category (ELECTRIC/SUV/SEDAN/HATCHBACK/MPV), price (decimal 12,2, not null), fuel_type (ELECTRIC/PETROL/DIESEL/HYBRID), seating_capacity (integer), created_at.

**vehicles** - Physical vehicle records, referencing the KIA catalog.
Fields: id, kia_id (FK to kia_cars), price (decimal 10,2, overridable), category (max 50), created_at, updated_at, is_deleted.

**inventory** - Tracks vehicle stock per dealership.
Fields: id, vehicle_id (FK), kia_car_id (FK), dealer_id (FK), manager_id (FK), quantity, status (max 50: Available/Reserved/Sold), created_at, updated_at, is_deleted.

**orders** - Sales order records.
Fields: id, dealer_id (FK), vehicle_id (FK), quantity, total_price (decimal 12,2), status (max 50), manager_id (FK), created_at, updated_at, is_deleted.

**service_orders** - Vehicle service appointment records.
Fields: id, dealer_id (FK), vehicle_id (FK), description (TEXT), status (max 50), created_at, updated_at, is_deleted.

**leads** - Customer prospecting records.
Fields: id, first_name (max 50), last_name (max 50), email (max 100), phone (max 20), vehicle_interest (max 100), status (max 50), notes (TEXT), dealer_id (FK), kia_car_id (FK), created_at, updated_at, is_deleted.

**test_drives** - Test drive scheduling records.
Fields: id, lead_id (FK), vehicle_id (FK), scheduled_at (LocalDateTime, not null), status (max 50: PENDING/COMPLETED/CANCELLED), dealer_id (FK), created_at, updated_at, is_deleted.

**parts** - Spare parts catalog per dealership.
Fields: id, name (max 100), price (decimal 10,2), stock (integer), supplier (max 100), dealer_id (FK), manager_id (FK), status (max 50), created_at, updated_at, is_deleted.

**purchase_orders** - Parts restocking requests.
Fields: id, part_id (FK), quantity, total_cost (decimal 12,2), justification (max 255), dealer_id (FK), manager_id (FK), created_at, updated_at, is_deleted.

**transactions** - Financial transaction ledger (auto-generated).
Fields: id, dealer_id (FK), amount (decimal 12,2), type (max 50: SALES/SERVICE), description (max 255), manager_id (FK), created_at, updated_at, is_deleted.

### 7.2 Data Validation Rules

- All required fields generate a 400 Bad Request response if absent or blank.
- Email fields are validated against standard RFC 5321 format.
- Phone/contact fields accept numeric characters, spaces, hyphens, and an optional leading `+` for country code.
- Date-time fields for scheduling (test drives, service) must not be set to past timestamps.
- All currency/amount fields store as BigDecimal with precision and scale defined per entity; negative values are rejected.
- Unique constraint violations (username, email, dealer name) return a 409 Conflict response.

### 7.3 Data Retention Policy

| Data Category | Minimum Retention |
|--------------|-------------------|
| Active operational records | Indefinite |
| Soft-deleted records (`is_deleted = true`) | 2 years |
| Audit log entries | 2 years |
| Financial transactions | 7 years (regulatory compliance) |
| User session / JWT data | 30 days |

---

## 8. Integrations and Reporting

### 8.1 Internal Module Integration Points

DealerPro modules are tightly integrated through shared data entities and backend service calls. The following cross-module interactions are automatic and system-enforced:

| Trigger | Automated System Action |
|---------|------------------------|
| Sales Order marked Completed | Linked inventory record status set to "Sold" |
| Sales Order marked Completed | Finance Transaction (type: SALES) created automatically |
| Service Order marked Completed | Finance Transaction (type: SERVICE) created automatically |
| Lead "Convert to Order" action | Sales Order form pre-filled with lead's customer details |
| Any data mutation (CREATE/UPDATE/DELETE) | Audit log entry written automatically by backend |

### 8.2 API Communication Standards

- All frontend-to-backend communication uses REST endpoints returning JSON payloads.
- Every authenticated request includes the HTTP header: `Authorization: Bearer <JWT token>`.
- List endpoints support query parameters: `page`, `size`, `sort`, `direction`, and entity-specific filter parameters.
- The backend applies role-based data scoping filters at the service layer before returning any data, ensuring Managers and Dealers never receive data outside their authorized scope.
- HTTP status codes used: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error.

### 8.3 Reports and Export

All reports within the Analytics module are generated on demand with user-defined filter parameters. Exports are initiated via a backend PDF/Excel generation endpoint. Report data is always scoped to the requesting user's role and dealership access.

---

## 9. Security Requirements

### 9.1 Authentication Security

- All login requests are validated against the stored BCrypt hash of the password. Plain-text passwords are never stored or logged.
- JWT tokens are signed using a secret key defined in the server configuration. Tampered tokens are rejected.
- Token expiry is set to 30 minutes. Expired tokens return 401 and trigger re-authentication.
- Account lockout activates after 5 consecutive failed login attempts, enforcing a 5-minute cooling-off period.

### 9.2 Authorization and Data Scoping

- Spring Security enforces method-level security using role annotations on all backend service methods.
- Frontend route guards check the authenticated user's role before rendering any protected page; unauthorized access attempts redirect to the login screen.
- The backend applies dealership scoping filters at the repository layer, meaning that even a direct API call with a valid token cannot retrieve data outside the role's authorized scope.

### 9.3 Transport and Data Security

- All data in transit is encrypted using HTTPS (TLS 1.2 or higher). HTTP access is not supported.
- SQL injection is prevented through the use of parameterized JPA/JPQL queries exclusively. Raw SQL is not used.
- XSS attack vectors are mitigated by sanitizing all user-provided input before storage and HTML-encoding output where applicable.
- CSRF protection is applied to all state-changing (POST, PUT, DELETE) API endpoints.

### 9.4 Sensitive Data Handling

- Passwords are hashed using BCrypt with an appropriate work factor before storage.
- JWTs do not contain sensitive personal information beyond user ID and role.
- Audit logs capture all access and mutation events, providing a forensic trail for security investigations.

---

## 10. Error Handling and Validations

### 10.1 Form-Level Validation

- All form fields are validated on the frontend before submission. Errors appear as inline messages directly below the offending field.
- Mandatory fields are marked with an asterisk (*) and highlighted on submit if empty.
- Validation checks run in real time on field blur, providing immediate feedback without requiring form submission.
- Forms cannot be submitted while any validation error is active.

### 10.2 API Error Responses

| HTTP Status | Scenario | User-Facing Message |
|-------------|----------|---------------------|
| 400 Bad Request | Missing or invalid input data | "Some fields have errors. Please review and try again." |
| 401 Unauthorized | Token expired or missing | "Your session has expired. Please sign in again." |
| 403 Forbidden | Role lacks permission | "You do not have permission to perform this action." |
| 404 Not Found | Record does not exist | "The requested record could not be found." |
| 409 Conflict | Duplicate unique field | "A record with this information already exists." |
| 500 Server Error | Unexpected backend failure | "An unexpected error occurred. Please try again or contact your system administrator." |

### 10.3 Network and Connectivity Errors

- If the frontend cannot reach the backend, a persistent banner is displayed across the top of the application: "Connection to the server failed. Please check your network and try again."
- Operations that fail due to a transient network error display a toast notification with a "Retry" action button.
- Loading states are represented by skeleton loaders in grids and spinner overlays on forms to prevent duplicate submissions.

---

## 11. Appendix

### Appendix A: Requirement Traceability Matrix

| FDD Section | BRD Requirement ID | BRD Description |
|-------------|-------------------|-----------------|
| 3 - User Roles | FR-UM-001 | Role-based access control |
| 4.1 - Authentication | FR-SEC-001 | JWT authentication and session security |
| 4.3 - Admin Panel | FR-UM-001 | User management and onboarding |
| 4.4 - Dealer Management | FR-DM-001 | Dealership administration |
| 4.5 - Vehicle Inventory | FR-INV-001 | Vehicle inventory lifecycle |
| 4.6 - Sales Orders | FR-SO-001 | Sales order processing |
| 4.7 - Service Management | FR-SVC-001 | Service appointment management |
| 4.8 - Lead Management | FR-LM-001 | Customer lead capture and pipeline |
| 4.9 - Test Drives | FR-TD-001 | Test drive scheduling |
| 4.10/4.11 - Parts | FR-PM-001 | Parts inventory and purchase orders |
| 4.12 - Finance | FR-FM-001 | Financial transaction tracking |
| 4.13 - Analytics | FR-AR-001 | Analytics and reporting |
| 4.14 - Audit Logs | FR-AL-001 | Comprehensive audit trail |
| 9 - Security | NFR-SEC-001 | Security and data protection |
| 6 - UI Design | NFR-USE-001 | Usability and responsiveness |

### Appendix B: Glossary of Terms

| Term | Definition |
|------|------------|
| Admin | System administrator with unrestricted global access |
| Audit Log | An immutable, system-generated record of all data change events |
| BaseEntity | Shared JPA superclass providing id, createdAt, updatedAt, and isDeleted to all entities |
| BCrypt | A cryptographic hashing algorithm used to securely store passwords |
| Dealer | A dealership staff user scoped to a single dealership |
| FDD | Functional Design Document; this document |
| JWT | JSON Web Token; a signed, stateless token used for session authentication |
| KIA Catalog | The master reference table (`kia_cars`) of all KIA vehicle models, variants, and configurations |
| Lead | A prospective customer who has expressed interest in purchasing a vehicle |
| Manager | A user overseeing one or more assigned dealerships |
| SPA | Single-Page Application; a web application that loads once and updates content dynamically |
| Soft Delete | The practice of setting `isDeleted = true` on a record instead of physically removing it |

### Appendix C: Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| BRD | Business Requirements Document |
| CRUD | Create, Read, Update, Delete |
| FDD | Functional Design Document |
| HTTPS | Hypertext Transfer Protocol Secure |
| JPA | Java Persistence API |
| JWT | JSON Web Token |
| KPI | Key Performance Indicator |
| ORM | Object-Relational Mapping |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SPA | Single-Page Application |
| SQL | Structured Query Language |
| TLS | Transport Layer Security |
| UI | User Interface |
| UX | User Experience |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | April 9, 2026 | DealerPro Team | Initial document creation |

**End of Document**
