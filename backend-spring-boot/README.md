# 🥤 FizzDrop Spring Boot Backend

Production-ready enterprise Spring Boot REST API for FizzDrop, managing carbonated beverages, multi-outlet inventories, role-based authentication, and live database administration.

---

## 🚀 Features

- **Beverage Catalog API**: Complete CRUD (`/api/products`), search by brand/category/flavor, and stock tracking across franchise branches.
- **Outlets Management**: Multi-branch and outlet management (`/api/outlets`) with active status controls.
- **Role-Based Authentication**: SuperAdmin (`superadmin@fizzdrop.com`), Supplier (`supplier@fizzdrop.com`), and Branch Staff logins (`/api/auth/login`, `/api/auth/me`).
- **Database Explorer & SQL Runner**: Native query execution endpoint (`/api/db/query`) and table introspection (`/api/db/tables`, `/api/db/status`) for the Superadmin Dashboard.
- **Cross-Origin Resource Sharing (CORS)**: Configured for Vite frontend (`http://localhost:5173`).

---

## 🛠️ Prerequisites

- **Java Development Kit (JDK)**: Java 25 or higher (`java -version`)
- **Maven**: 3.9.16 (or use the included wrapper script)
- **MySQL Server** (Optional for local persistent storage, port 3306)

---

## 🏃 Running in Visual Studio Code

### Method 1: Using VS Code Extensions (Recommended)
1. Install the official **Extension Pack for Java** and **Spring Boot Extension Pack** from the VS Code Marketplace.
2. Open the `backend-spring-boot` folder in VS Code or open the workspace.
3. Open `src/main/java/com/fizzdrop/FizzDropApplication.java`.
4. Click **Run** or press `F5` above the `main` method.

### Method 2: Integrated Terminal
Open a PowerShell terminal in `backend-spring-boot`:
```powershell
# Navigate to backend directory
cd backend-spring-boot

# Run Spring Boot application
mvn spring-boot:run
```

If Maven is installed locally or via wrapper:
```powershell
./mvnw.cmd spring-boot:run
```

---

## ⚙️ Configuration (`src/main/resources/application.properties`)

```properties
server.port=8080

# MySQL Connection Details
spring.datasource.url=jdbc:mysql://localhost:3306/fizzdrop_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA / Hibernate auto table sync
spring.jpa.hibernate.ddl-auto=update
```

Environment variables can also be used:
- `DB_URL`
- `DB_USER`
- `DB_PASSWORD`

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/products` | `GET` | List all beverages (supports `?branchId=`, `?brand=`, `?category=`, `?search=`) |
| `/api/products/new-arrivals` | `GET` | Recent beverage drops |
| `/api/products/{id}` | `GET` | Single product detail with branch stock |
| `/api/products` | `POST` | Add new beverage product |
| `/api/products/{id}` | `PUT` | Update beverage details & image |
| `/api/products/{id}` | `DELETE` | Delete beverage product |
| `/api/outlets` | `GET` | List all retail outlets |
| `/api/outlets` | `POST` | Register a new outlet |
| `/api/outlets/{id}` | `PUT` | Edit outlet details |
| `/api/outlets/{id}` | `DELETE` | Remove outlet |
| `/api/auth/login` | `POST` | Authenticate user (Superadmin / Supplier) |
| `/api/auth/me` | `GET` | Inspect current session token |
| `/api/db/status` | `GET` | Live database health and engine info |
| `/api/db/tables` | `GET` | List of SQL schema tables |
| `/api/db/query` | `POST` | Execute raw SQL query from Superadmin Explorer |
