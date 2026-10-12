# 🍲 NeighborPlates

> **Peer-to-Peer Home-Cooked Meal Marketplace & Delivery Platform**  
> Connecting passionate local home cooks with hungry neighbors, supported by community delivery riders, AI meal recommendations, and administrative operations.

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NativeWind](https://img.shields.io/badge/NativeWind-v4_Tailwind-38BDF8?logo=tailwindcss&logoColor=white)](https://www.nativewind.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.2-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Swagger](https://img.shields.io/badge/OpenAPI-Swagger_UI-85EA2D?logo=swagger&logoColor=black)](http://localhost:8081/swagger-ui.html)

---

## ⚡ Quick Start: Running Commands

To run NeighborPlates locally, open **TWO separate terminal windows** (Terminal 1 for the Backend and Terminal 2 for the Mobile app):

```
┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│             TERMINAL 1: BACKEND              │       │              TERMINAL 2: MOBILE              │
│            Spring Boot (Java 17)             │       │          React Native (Expo SDK 57)          │
│                  Port 8081                   │       │                  Port 8082                   │
└──────────────────────────────────────────────┘       └──────────────────────────────────────────────┘
```

### 🟢 TERMINAL 1: Run Backend Server

```bash
cd backend
mvn spring-boot:run
```

* 🌐 **Server Port:** `8081`
* 📑 **Interactive Swagger UI:** [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)
* 💡 *First-time clean build (optional):* `mvn clean install -DskipTests && mvn spring-boot:run`

---

### 📱 TERMINAL 2: Run Mobile Application

```bash
cd mobile
npm install
npm start
```

* 🌐 **Expo Metro Port:** `8082`
* 📲 **Open on your device:**
  * **Physical Phone:** Scan the QR code in the terminal using the **Expo Go** app (iOS/Android).
  * **Android Emulator:** Press <kbd>a</kbd> in the terminal (or run `npm run android`).
  * **iOS Simulator:** Press <kbd>i</kbd> in the terminal (or run `npm run ios`).
  * **Web Browser:** Press <kbd>w</kbd> in the terminal (or run `npm run web`).

---

### 🔑 Test Logins (Pre-Seeded Demo Accounts)

When the app opens, you can log in immediately using any of these test accounts:

| Role | Email | Password | What You Can Test |
| :--- | :--- | :--- | :--- |
| **👤 Customer** | `customer.demo@neighborplates.com` | `cust123` | Browse meals, cart, checkout with card/COD, track orders, chat with AI |
| **👩‍🍳 Home Cook** | `nimali.cook@neighborplates.com` | `cook123` | Create meals with photos, create combo specials, accept & prepare orders |
| **🚴 Delivery Rider** | `rider@neighborplates.com` | `rider123` | View available delivery jobs, accept order, live route, mark delivered |
| **🛡️ Administrator** | `admin@neighborplates.com` | `admin123` | Platform operations dashboard, user ban/activate, rider verification |

*(You can also use the in-app **Register** screen to create your own new account for any role!)*

---

## 📖 Table of Contents
- [Quick Start: Running Commands](#-quick-start-running-commands)
- [Prerequisites](#-prerequisites)
- [Detailed Setup & Run Guide](#-detailed-setup--run-guide)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Backend Setup & Run](#step-2-backend-setup--run)
  - [Step 3: Mobile Setup & Run](#step-3-mobile-setup--run)
- [Mobile CLI Commands Cheat Sheet](#-mobile-cli-commands-cheat-sheet)
- [System Architecture & Roles](#-system-architecture--roles)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [REST API Endpoints & Swagger](#-rest-api-endpoints--swagger)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 📋 Prerequisites

Make sure the following tools are installed on your computer:

| Requirement | Minimum Version | Check Command |
| :--- | :--- | :--- |
| **Java JDK** | Version `17` or higher | `java -version` |
| **Apache Maven** | Version `3.9` or higher | `mvn -version` |
| **Node.js & npm** | Node `18.x` or `20.x` LTS | `node -v` and `npm -v` |
| **MongoDB** | Cloud Atlas *(pre-configured)* or local | `mongod --version` |
| **Expo Go** *(optional for phone testing)* | Latest | Install from [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) |

---

## 🛠️ Detailed Setup & Run Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ravindu-Dev/NeighborPlates.git
cd NeighborPlates
```

---

### Step 2: Backend Setup & Run

The backend is built with **Spring Boot 3.4.2** and runs on **Port `8081`**.

#### 2.1 Configuration
Backend settings are located in `backend/src/main/resources/application.yml`:
* **Port:** `server.port = 8081`
* **Database:** Default MongoDB Atlas connection string is already configured.
* **Database Seeder:** Seeds default accounts (`admin`, `rider`, `cook`, `customer`) automatically on startup.

*(Optional)* If you wish to use your own local MongoDB instance instead:
```bash
# Set environment variable before starting (or edit application.yml)
export SPRING_DATA_MONGODB_URI="mongodb://localhost:27017/neighborplates"
```

#### 2.2 Run the Server
Open your **first terminal window**:

```bash
cd backend
mvn spring-boot:run
```

#### 2.3 Verify Backend is Active
* The console will output: `Started NeighborPlatesApplication in ... seconds`
* Open Swagger UI in your browser to verify all endpoints:  
  👉 **[http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)**
* Raw OpenAPI JSON schema:  
  👉 **[http://localhost:8081/api-docs](http://localhost:8081/api-docs)**

---

### Step 3: Mobile Setup & Run

The mobile frontend is built with **React Native (Expo SDK 57)** and runs on **Port `8082`**.

#### 3.1 Install Dependencies
Open your **second terminal window**:

```bash
cd mobile
npm install
```
> ℹ️ *Note: `npm install` automatically runs `node scripts/patch-css-interop.js` during postinstall to guarantee seamless NativeWind v4 Tailwind CSS compilation.*

#### 3.2 Network Connection & Auto-Discovery
The mobile app features **automatic host IP resolution** in `mobile/src/services/api.ts`:
* **Expo Go on Physical Phone:** Automatically detects your computer's local IP address from Metro bundler. **Ensure your phone and PC are connected to the same Wi-Fi network.**
* **Android Emulator:** Automatically connects to `http://10.0.2.2:8081`.
* **iOS Simulator / Web:** Automatically connects to `http://localhost:8081`.

*(Optional custom override)* You can create a `mobile/.env` file if using a tunnel or custom IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8081
```

#### 3.3 Start the Mobile App
```bash
cd mobile
npm start
```
This runs `expo start --port 8082` and renders an interactive QR code in your terminal.

---

## ⌨️ Mobile CLI Commands Cheat Sheet

Run any of these commands from the `mobile` folder:

```bash
# Standard interactive launch (Port 8082 with QR code)
npm start

# Direct launch on connected Android device or Android Studio emulator
npm run android

# Direct launch on Xcode iOS simulator (macOS only)
npm run ios

# Direct launch on Web Browser
npm run web

# Clear Metro cache & restart (use if CSS or bundle gets stuck)
npx expo start -c --port 8082
```

---

## 🌟 System Architecture & Roles

NeighborPlates is designed around four core user roles:

| Role | Key Features |
| :--- | :--- |
| **👤 Customer** | Search & filter dishes by dietary tags (Halal, Veg, Gluten-Free), add to cart, checkout with Stripe card or Cash on Delivery, track order status in real time, leave reviews, and chat with AI culinary assistant. |
| **👩‍🍳 Home Cook** | Kitchen profile, publish meal listings with photos (ImgBB CDN), package combo deals, receive live orders, transition status (`ACCEPTED` → `PREPARING` → `READY`), and view revenue dashboards. |
| **🚴 Courier / Rider** | View live dispatch board for orders ready for delivery, accept orders, follow pickup and delivery routes, verify equipment (thermal bag, warmer pod, HACCP), and track earnings. |
| **🛡️ Administrator** | Operational dashboard with live metrics, user moderation (ban/activate accounts, approve rider documents), dish content moderation, and revenue analytics. |

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Mobile App** | React Native `0.86`, Expo SDK `57` | Cross-platform iOS, Android, and Web client |
| **Styling** | NativeWind `v4` (Tailwind CSS `3.4`) | Utility-first modern responsive styles |
| **State & Navigation** | Zustand + React Navigation `v7` | Client state, persisted auth, and tab/stack routing |
| **Backend Framework** | Spring Boot `3.4.2`, Java `17` | REST API with modular controllers and services |
| **Security** | Spring Security + JJWT `0.11.5` | Stateless JWT authentication with refresh token rotation |
| **Database** | MongoDB | NoSQL document storage (users, meals, combos, orders, reviews) |
| **API Documentation** | SpringDoc OpenAPI `2.8.5` | Interactive Swagger UI on Port `8081` |
| **Payment Gateway** | Stripe Java SDK `24.0.0` | Test card charge simulation and verification |
| **Image CDN** | ImgBB API | High-speed photo uploads with client-side compression |
| **AI Assistant** | CometAPI / OpenAI-compatible endpoint | Intelligent dish recommendation and food chatbot |

---

## 📁 Project Directory Structure

```
NeighborPlates/
├── backend/                                # Spring Boot REST API
│   ├── src/main/java/com/neighborplates/
│   │   ├── config/                        # Security, CORS, Mongo, DatabaseSeeder
│   │   ├── controller/                    # Auth, Meal, Combo, Order, Payment, Rider, Admin, AI
│   │   ├── dto/                           # Request & Response Data Transfer Objects
│   │   ├── exception/                     # Global exception handlers
│   │   ├── model/                         # MongoDB Document entities (User, Meal, Order, Combo, Review)
│   │   ├── repository/                    # Spring Data Mongo repositories
│   │   ├── security/                      # JWT token provider & authentication filter
│   │   └── service/                       # Business logic services
│   ├── src/main/resources/
│   │   └── application.yml                # Server ports, Mongo URI, JWT secrets, Stripe & AI keys
│   └── pom.xml                            # Maven project build descriptor
│
├── mobile/                                 # React Native (Expo) Mobile Client
│   ├── assets/                            # Branding, icons, splash screens
│   ├── scripts/                           # Postinstall patch scripts (CSS interop)
│   ├── src/
│   │   ├── components/                    # Reusable UI components
│   │   ├── constants/                     # Filter constants, categories
│   │   ├── navigation/                    # Auth, Customer, Cook, Rider, and Admin navigators
│   │   ├── screens/                       # Role-based screens (auth, customer, cook, rider, admin)
│   │   ├── services/                      # Axios API client, auto IP resolution, image & location services
│   │   ├── store/                         # Zustand stores (auth, cart, meal state)
│   │   └── theme/                         # Styling & theme variables
│   ├── app.json                           # Expo application configuration
│   ├── package.json                       # Mobile dependencies & npm run scripts
│   ├── tailwind.config.js                 # NativeWind styling tokens
│   └── tsconfig.json                      # TypeScript configuration
│
└── README.md                              # Project documentation & runbook
```

---

## 🔌 REST API Endpoints & Swagger

Access the interactive API documentation at: **[http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)**

| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Login and receive JWT access + refresh tokens | Public |
| `POST` | `/api/auth/refresh` | Obtain fresh access token using refresh token | Public |
| `GET` | `/api/meals` | List active meals with optional dietary filters | Public |
| `POST` | `/api/meals` | Create a new meal listing | Cook |
| `GET` | `/api/combos` | List active meal combo bundles | Public |
| `POST` | `/api/combos` | Create a new combo bundle | Cook |
| `POST` | `/api/orders` | Place a customer order | Customer |
| `GET` | `/api/orders/my-orders` | Fetch current user's order history | Authenticated |
| `PUT` | `/api/orders/{id}/status`| Update order status (`ACCEPTED`, `PREPARING`, `READY`) | Cook |
| `POST` | `/api/payments/charge` | Process payment via Stripe test gateway | Customer |
| `GET` | `/api/riders/orders/available` | List orders waiting for courier pickup | Rider |
| `POST` | `/api/riders/orders/{id}/accept` | Accept delivery dispatch job | Rider |
| `POST` | `/api/riders/orders/{id}/complete` | Mark delivery job as completed | Rider |
| `GET` | `/api/admin/users` | List all platform users with role filters | Admin |
| `PUT` | `/api/admin/users/{id}/status` | Activate or ban user account | Admin |
| `POST` | `/api/ai/chat` | AI Culinary chatbot recommendations | Authenticated |

---

## 🔧 Troubleshooting & FAQs

### 1. Mobile app displays network connection error or fails to load data
* **Same Wi-Fi Network:** If testing on a physical phone via Expo Go, make sure your phone and PC are on the **exact same Wi-Fi network**.
* **Firewall Ports:** Ensure Windows Defender / your firewall allows incoming traffic on port `8081` (Spring Boot API) and `8082` (Expo Metro).
* **Explicit IP Setting:** If auto-discovery does not pick the right network adapter, create a `mobile/.env` file:
  ```env
  EXPO_PUBLIC_API_URL=http://<YOUR_PC_LAN_IP>:8081
  ```
  *(Find your IP by running `ipconfig` on Windows or `ifconfig` on macOS/Linux).*

### 2. Styles or NativeWind classes not updating
Clear Metro cache and restart:
```bash
cd mobile
npx expo start -c --port 8082
```

### 3. Port conflict (Port 8081 or 8082 already in use)
* **Backend:** Change `server.port` in `backend/src/main/resources/application.yml` (e.g., `8085`).
* **Mobile:** Update the `--port` flag in `mobile/package.json` scripts or run `npx expo start --port 8083`.

### 4. Maven build or Java version errors
* Confirm your JDK version is 17+:
  ```bash
  java -version
  ```
* If build issues occur, run a clean compile:
  ```bash
  cd backend
  mvn clean compile
  ```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](mobile/LICENSE) file for details.
