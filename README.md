# NeighborPlates

NeighborPlates is a peer-to-peer home-cooked meal delivery platform connecting local home cooks with nearby customers (students, working professionals, and residents).

## Project Structure
- `mobile/`: React Native (Expo) mobile application using TypeScript and NativeWind v4 (Tailwind CSS).
- `backend/`: Spring Boot REST API using MongoDB and stateless JWT security.
- `docs/`: HCI reports and user research documents.

## Tech Stack
- **Mobile:** React Native, Expo, React Navigation, Reanimated, Zustand, Axios, NativeWind (Tailwind CSS).
- **Backend:** Java 17+, Spring Boot 3.x, Spring Security, Spring Data MongoDB, JJWT.
- **Database:** MongoDB.
- **Real-Time Integration:** Firebase Realtime Database & FCM.
- **Image Offloading:** ImgBB API (client-side compression + URL reference).

## Setup & Running

### Prerequisites
- Node.js (v18+)
- Java JDK (v17+)
- Maven (v3.9+)
- MongoDB (running locally or remote connection string)

### Running the Mobile App
```bash
cd mobile
npm install
npm run android # Or npm run ios / npm run web
```

### Running the Backend Server
```bash
cd backend
mvn clean install
mvn spring-boot:run
```
