# NeighborPlates

NeighborPlates is a peer-to-peer home-cooked meal delivery platform connecting local home cooks with nearby customers, community delivery riders, and administrators.

---

## 🚀 How to Run the Project

Run the backend and mobile app in **two separate terminal windows**:

### 1. Running the Backend Server (Terminal 1)

```bash
cd backend
mvn clean install -DskipTests
mvn spring-boot:run
```

* **Server Port:** `http://localhost:8081`
* **Swagger API Docs:** `http://localhost:8081/swagger-ui.html`

---

### 2. Running the Mobile App (Terminal 2)

```bash
cd mobile
npm install
npm start
```

* **Expo Metro Port:** `http://localhost:8082`
* **Physical Device:** Open **Expo Go** on your phone (iOS / Android) and scan the QR code.

#### Platform Shortcuts:
```bash
npm run android   # Run on Android emulator / device
npm run ios       # Run on iOS simulator (macOS)
npm run web       # Run on Web browser
```

---

## 👥 Demo Logins

Use any of these pre-seeded accounts to log in:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `customer.demo@neighborplates.com` | `cust123` |
| **Cook** | `nimali.cook@neighborplates.com` | `cook123` |
| **Rider** | `rider@neighborplates.com` | `rider123` |
| **Admin** | `admin@neighborplates.com` | `admin123` |

---

## 📋 Prerequisites

- **Node.js** (v18+) & **npm**
- **Java JDK** (v17+)
- **Apache Maven** (v3.9+)
- **MongoDB** (Cloud Atlas pre-configured in `application.yml` or local)
- **Expo Go** app on your phone (or Android Studio emulator / Xcode simulator)

---

## 📁 Project Structure

- `mobile/`: React Native (Expo) mobile application using TypeScript and NativeWind v4 (Tailwind CSS).
- `backend/`: Spring Boot REST API using MongoDB, Spring Security, and stateless JWT.
- `docs/`: HCI reports and user research documents.

---

## 🛠️ Tech Stack

- **Mobile:** React Native (Expo SDK 57), TypeScript, React Navigation, NativeWind (Tailwind CSS), Zustand, Axios.
- **Backend:** Java 17, Spring Boot 3.4.2, Spring Security, Spring Data MongoDB, JJWT, SpringDoc OpenAPI (Swagger).
- **Database:** MongoDB.
- **Payments:** Stripe API (Test mode).
- **Images:** ImgBB API.
- **AI Chat:** CometAPI.

---

## 💡 Notes & Tips

- **Same Wi-Fi:** Ensure your phone and PC are connected to the same Wi-Fi network when running Expo Go on a physical phone.
- **Reset Cache:** If styles or bundler get stuck, run:
  ```bash
  cd mobile
  npx expo start -c --port 8082
  ```
