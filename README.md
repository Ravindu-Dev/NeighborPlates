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

## ⚡ Quick Start: Running Commands (TL;DR)

To run the entire platform locally, open **two separate terminal windows**:

### 🟢 Terminal 1: Run the Backend (Spring Boot API)
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Run the Spring Boot server (starts on port 8081)
mvn spring-boot:run
```
> 🌐 **Backend URL:** [http://localhost:8081](http://localhost:8081)  
> 📑 **Swagger UI:** [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)  
> *(First-time build alternative: `mvn clean install -DskipTests && mvn spring-boot:run`)*

---

### 📱 Terminal 2: Run the Mobile App (React Native / Expo)
```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install dependencies (only required the first time)
npm install

# 3. Start Expo development server (starts on port 8082)
npm start
```

#### Shortcut Commands for Specific Platforms:
| Platform | Command | Notes |
| :--- | :--- | :--- |
| **Expo Interactive Menu** | `npm start` | Generates QR code + keyboard shortcuts menu |
| **Android Device / Emulator** | `npm run android` | Launches on running Android emulator or USB device |
| **iOS Simulator** | `npm run ios` | Launches on Xcode iOS simulator (macOS only) |
| **Web Browser** | `npm run web` | Launches the React Native Web preview in your browser |
| **Reset Cache & Start** | `npx expo start -c --port 8082` | Clears Metro bundler and NativeWind cache |

---

## 📖 Table of Contents
- [Quick Start: Running Commands (TL;DR)](#-quick-start-running-commands-tldr)
- [Overview](#-overview)
- [Key Features by Role](#-key-features-by-role)
- [Tech Stack](#-tech-stack)
- [System Architecture & Repository Structure](#-system-architecture--repository-structure)
- [Prerequisites](#-prerequisites)
- [Detailed Setup & Run Guide](#-detailed-setup--run-guide)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup & Run (Spring Boot)](#2-backend-setup--run-spring-boot)
  - [3. Mobile Setup & Run (React Native / Expo)](#3-mobile-setup--run-react-native--expo)
- [Pre-seeded Demo Accounts](#-pre-seeded-demo-accounts)
- [REST API Endpoints & Swagger](#-rest-api-endpoints--swagger)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌟 Overview

**NeighborPlates** transforms how communities access authentic home-cooked meals. Built with a robust **Spring Boot** backend and an intuitive **React Native (Expo)** mobile application, the platform supports four dedicated user workflows:

- **Customers** discover local culinary talents, order wholesome home meals, customize orders, and track deliveries.
- **Home Cooks** publish and manage meal offerings, configure combo specials, upload dish photography via CDN, and track earnings.
- **Riders (Couriers)** view available neighborhood delivery requests, accept deliveries, navigate live drop-offs, and earn on their own schedule.
- **Administrators** monitor system health, oversee live deliveries, moderate listings, and verify rider & cook credentials.

---

## 🚀 Key Features by Role

### 👤 Customer
- **Discovery & Search**: Browse home cooks with dietary tags (Halal, Vegetarian, Vegan, Gluten-Free), spice levels, distance filters, and keyword search.
- **Cart & Dynamic Checkout**: Add individual meals or combo specials, configure delivery addresses, and apply order notes.
- **Flexible Payments**: Seamless card payments powered by Stripe test integration or Cash on Delivery (COD).
- **Live Order Tracking**: Interactive progress tracking from placed, kitchen accepted, preparing, ready, out for delivery, to delivered.
- **Reviews & Ratings**: Share ratings and feedback for meals and home cooks.
- **AI Culinary Assistant**: Built-in AI chat assistant for personalized dish recommendations and nutritional guidance.

### 👩‍🍳 Home Cook
- **Listing Management**: Create, update, and manage meals with pricing, portion quantities, dietary flags, and high-res photos (ImgBB CDN integration).
- **Meal Combos & Promotions**: Bundle popular dishes into value packages and meal deals.
- **Order Workflow**: Real-time incoming orders with status progression (`ACCEPTED` → `PREPARING` → `READY`).
- **Earnings & Analytics**: Daily and total revenue breakdown, completed order statistics, and customer ratings.

### 🚴 Delivery Rider (Courier)
- **Dispatch Board**: View real-time available orders awaiting courier pickup.
- **Turn-by-Turn Delivery Workflow**: Accept orders, navigate between cook pickup and customer delivery locations, and complete deliveries with confirmation.
- **Equipment & Compliance Verification**: Profile management including vehicle type, HACCP certification, thermal bag, and warmer pod indicators.
- **Delivery History & Earnings**: Track completed deliveries, tips, and distance metrics.

### 🛡️ Administrator
- **Live Operations Dashboard**: High-level platform monitoring of active orders, orders by status, and system metrics.
- **User Management**: Search users, toggle account status (ban/activate), approve rider credentials, and update user roles.
- **Content Moderation**: Review and moderate dish listings and community reviews.
- **Platform Analytics**: Revenue, order volume, and active user distribution.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile Frontend** | React Native `0.86`, Expo SDK `57`, TypeScript, NativeWind `v4` (Tailwind CSS `3.4`), React Navigation `v7`, Zustand, Axios, Reanimated, Expo Image Picker, Expo Location |
| **Backend API** | Java `17`, Spring Boot `3.4.2`, Spring Security (Stateless JWT), Spring Data MongoDB, SpringDoc OpenAPI `2.8.5` (Swagger UI), Lombok |
| **Database** | MongoDB (Atlas cloud cluster or local instance) |
| **Authentication** | JWT (JSON Web Tokens) with HMAC-SHA256 signature verification & refresh tokens |
| **Payment Gateway** | Stripe Java SDK (`24.0.0`) test mode integration |
| **Image Hosting** | ImgBB API with client-side compression |
| **AI Integration** | CometAPI / OpenAI-compatible endpoint (`gpt-4o-mini`) |

---

## 📁 System Architecture & Repository Structure

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

## 📋 Prerequisites

Before running NeighborPlates, make sure you have the following installed on your development machine:

1. **Java Development Kit (JDK)**: Version `17` or higher (`java -version`).
2. **Apache Maven**: Version `3.9` or higher (`mvn -version`).
3. **Node.js**: Version `18.x` or `20.x` LTS (`node -v` and `npm -v`).
4. **MongoDB**:
   - The backend defaults to a pre-configured MongoDB Atlas connection in `application.yml`.
   - Alternatively, you can run a local MongoDB instance (`mongodb://localhost:27017/neighborplates`).
5. **Mobile Testing Environment**:
   - **Expo Go App** installed on your physical iOS or Android smartphone ([App Store](https://apps.apple.com/app/expo-go/id982107779) / [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)), **OR**
   - **Android Studio Emulator** / **Xcode Simulator**, **OR**
   - Modern Web Browser (Chrome / Edge / Firefox).

---

## 📖 Detailed Setup & Run Guide

### 1. Clone the Repository

```bash
git clone https://github.com/Ravindu-Dev/NeighborPlates.git
cd NeighborPlates
```

---

### 2. Backend Setup & Run (Spring Boot)

The backend runs on **Port `8081`** by default.

#### Step 2.1: Review Configuration
Backend configuration is located at `backend/src/main/resources/application.yml`:
- **Port:** `server.port = 8081`
- **Database:** MongoDB connection string (`spring.data.mongodb.uri`).
- **Swagger Docs:** `http://localhost:8081/swagger-ui.html`

> [!TIP]
> You can override the MongoDB URI using an environment variable without modifying code:
> ```bash
> export SPRING_DATA_MONGODB_URI="mongodb://localhost:27017/neighborplates"
> ```

#### Step 2.2: Build and Run the Backend
Open a terminal inside the project root:

```bash
cd backend

# Compile dependencies and package the application
mvn clean install -DskipTests

# Start the Spring Boot server
mvn spring-boot:run
```

Once started, the backend automatically runs `DatabaseSeeder` to initialize essential collections, default administrator credentials, courier profiles, and sample ready-for-dispatch orders.

#### Step 2.3: Verify the Backend is Running
Open your browser and navigate to:
- **Swagger UI:** [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)
- **OpenAPI JSON Docs:** [http://localhost:8081/api-docs](http://localhost:8081/api-docs)

---

### 3. Mobile Setup & Run (React Native / Expo)

The mobile client is managed by Expo and Metro bundler running on **Port `8082`**.

#### Step 3.1: Install Dependencies
Open a second terminal window:

```bash
cd mobile

# Install dependencies (runs patch-css-interop.js automatically via postinstall)
npm install
```

#### Step 3.2: Configure Backend API Connection
The mobile app features **automatic LAN IP detection** in `mobile/src/services/api.ts`.
- **Physical Device (Expo Go):** Automatically detects the Metro bundler host IP of your computer, so requests route to `http://<YOUR_LOCAL_IP>:8081`. Make sure your phone and development PC are connected to the **same Wi-Fi network**.
- **Android Emulator:** Automatically routes to `http://10.0.2.2:8081`.
- **Web / iOS Simulator:** Automatically routes to `http://localhost:8081`.

*(Optional)* If you want to explicitly hardcode an IP or use an ngrok/remote tunnel, create a `mobile/.env` file:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8081
```

#### Step 3.3: Start the Expo Development Server
Run the Metro bundler:

```bash
npm start
```
*(This executes `expo start --port 8082`)*

#### Step 3.4: Launch on Your Device or Emulator
Once the QR code appears in your terminal:
- **Physical Device:** Open the **Expo Go** app on your Android or iOS device and scan the terminal QR code.
- **Android Emulator:** Press <kbd>a</kbd> in the terminal (with an emulator running in Android Studio), or execute `npm run android`.
- **iOS Simulator (macOS only):** Press <kbd>i</kbd> in the terminal, or execute `npm run ios`.
- **Web Browser:** Press <kbd>w</kbd> in the terminal, or execute `npm run web`.

---

## 👥 Pre-seeded Demo Accounts

The backend seed script (`DatabaseSeeder.java`) automatically populates the following test accounts:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **🛡️ Administrator** | `admin@neighborplates.com` | `admin123` | Full access to user management, moderation, and live operations. |
| **🚴 Delivery Rider** | `rider@neighborplates.com` | `rider123` | Verified courier with E-Bike profile and active dispatch jobs. |
| **👩‍🍳 Home Cook** | `nimali.cook@neighborplates.com` | `cook123` | Home cook with sample kitchen and menu listings. |
| **👤 Customer** | `customer.demo@neighborplates.com` | `cust123` | Customer account ready to explore, order, and review. |

> [!NOTE]
> You can also register a brand new account of any role directly from the app's onboarding & registration screens.

---

## 🔌 REST API Endpoints & Swagger

The interactive Swagger UI documentation is available at `http://localhost:8081/swagger-ui.html`. Key endpoints include:

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`CUSTOMER`, `COOK`, `RIDER`) | Public |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token pair | Public |
| `POST` | `/api/auth/refresh` | Exchange refresh token for fresh access token | Public |
| `GET` | `/api/meals` | List active meals with optional dietary filters | Public |
| `POST` | `/api/meals` | Create a new meal listing | Cook |
| `GET` | `/api/combos` | List active meal combo bundles | Public |
| `POST` | `/api/combos` | Create a new combo package | Cook |
| `POST` | `/api/orders` | Place a customer order | Customer |
| `GET` | `/api/orders/my-orders` | Retrieve current user's order history | Authenticated |
| `PUT` | `/api/orders/{id}/status`| Progress order status (`ACCEPTED`, `PREPARING`, `READY`) | Cook |
| `POST` | `/api/payments/charge` | Process card payment via Stripe test gateway | Customer |
| `GET` | `/api/riders/orders/available` | List orders ready for delivery dispatch | Rider |
| `POST` | `/api/riders/orders/{id}/accept` | Accept and assign order to courier | Rider |
| `POST` | `/api/riders/orders/{id}/complete` | Mark delivery as completed | Rider |
| `GET` | `/api/admin/users` | List platform users with search and filter | Admin |
| `PUT` | `/api/admin/users/{id}/status` | Activate or ban user account | Admin |
| `POST` | `/api/ai/chat` | AI Culinary chatbot recommendations | Authenticated |

---

## 🔧 Troubleshooting & FAQs

### 1. Mobile app displays network connection error or fails to fetch meals
- **Same Network Check:** Ensure your computer and smartphone are connected to the exact same Wi-Fi network.
- **Firewall:** Verify that your computer's firewall allows incoming connections on port `8081` (Spring Boot) and `8082` (Expo Metro).
- **Explicit IP:** In `mobile/.env`, set `EXPO_PUBLIC_API_URL=http://<YOUR_COMPUTER_LAN_IP>:8081`. You can find your LAN IP via `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

### 2. NativeWind styling or CSS cache issues
If styles appear improperly rendered or cached after package changes:
```bash
cd mobile
npx expo start -c --port 8082
```
The `-c` flag clears Metro cache and resets NativeWind compiled stylesheets.

### 3. Port 8081 or 8082 is already in use
- **Backend:** Change `server.port` in `backend/src/main/resources/application.yml` (e.g. to `8085`).
- **Mobile:** Adjust `--port` argument in `mobile/package.json` scripts.

### 4. Java / Maven Build Issues
- Ensure `JAVA_HOME` is pointed to JDK 17 or higher. Check with:
  ```bash
  java -version
  javac -version
  ```
- If Lombok warnings appear, run `mvn clean compile` to trigger Lombok annotation processors.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](mobile/LICENSE) file for details.
