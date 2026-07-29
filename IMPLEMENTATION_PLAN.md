# NeighborPlates — Premium Implementation Plan

## 🏗️ 1. Architecture & Repository Setup

### 1.1 Monorepo Structure (Modular, Conflict-Free for 4 Members)

```
NeighborPlates/
├── docs/                              # HCI reports, design docs, meeting notes
│   └── IT3060_HCI_Assignment1_Report.html
│
├── mobile/                            # React Native App (Members A & B)
│   ├── android/
│   ├── ios/
│   ├── src/
│   │   ├── assets/                    # Fonts, icons, static images
│   │   │   ├── fonts/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   │
│   │   ├── components/                # Shared, reusable UI components
│   │   │   ├── common/                # Button, Input, Card, Avatar, Badge, Modal
│   │   │   ├── customer/              # MealCard, CookProfile, OrderTimeline
│   │   │   ├── cook/                  # ListingForm, OrderDashboard, EarningsChart
│   │   │   └── admin/                 # UserTable, ReportCard, AnalyticsWidget
│   │   │
│   │   ├── navigation/                # React Navigation router
│   │   │   ├── AppNavigator.tsx        # Root navigator with auth gate
│   │   │   ├── CustomerNavigator.tsx   # Customer tab/stack navigator
│   │   │   ├── CookNavigator.tsx       # Cook tab/stack navigator
│   │   │   ├── AdminNavigator.tsx      # Admin tab/stack navigator
│   │   │   └── AuthNavigator.tsx       # Login/Register/Onboarding stack
│   │   │
│   │   ├── screens/                   # Screen components (one per route)
│   │   │   ├── auth/                  # LoginScreen, RegisterScreen, RoleSelectScreen
│   │   │   ├── customer/              # HomeScreen, MealDetailScreen, OrderTrackingScreen,
│   │   │   │                          # ProfileScreen, FavoritesScreen, SearchScreen
│   │   │   ├── cook/                  # CookDashboardScreen, CreateListingScreen,
│   │   │   │                          # OrdersScreen, EarningsScreen, CookProfileScreen
│   │   │   └── admin/                 # AdminDashboardScreen, UserManagementScreen,
│   │   │                              # ContentModerationScreen, AnalyticsScreen
│   │   │
│   │   ├── services/                  # API client, Firebase, ImgBB integration
│   │   │   ├── api.ts                 # Axios instance with JWT interceptor
│   │   │   ├── authService.ts
│   │   │   ├── mealService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── imageService.ts        # ImgBB upload with client-side compression
│   │   │   └── firebaseService.ts     # Real-time listeners
│   │   │
│   │   ├── store/                     # State management (Zustand or Context)
│   │   │   ├── authStore.ts
│   │   │   ├── mealStore.ts
│   │   │   ├── orderStore.ts
│   │   │   └── notificationStore.ts
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useLocation.ts
│   │   │   ├── useRealtimeOrders.ts
│   │   │   └── useImagePicker.ts
│   │   │
│   │   ├── utils/                     # Helpers, constants, validators
│   │   │   ├── constants.ts
│   │   │   ├── validators.ts
│   │   │   ├── imageCompressor.ts     # Client-side compression before ImgBB
│   │   │   ├── dateUtils.ts
│   │   │   └── formatters.ts
│   │   │
│   │   ├── theme/                     # Design tokens, colors, typography
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   └── index.ts
│   │   │
│   │   └── App.tsx                    # Root component
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── metro.config.js
│   └── app.json
│
├── backend/                           # Spring Boot API (Members C & D)
│   ├── src/main/java/com/neighborplates/
│   │   ├── NeighborPlatesApplication.java
│   │   │
│   │   ├── config/                    # Security, CORS, MongoDB, Firebase config
│   │   │   ├── SecurityConfig.java
│   │   │   ├── JwtConfig.java
│   │   │   ├── MongoConfig.java
│   │   │   ├── CorsConfig.java
│   │   │   └── FirebaseConfig.java
│   │   │
│   │   ├── controller/                # REST API endpoints
│   │   │   ├── AuthController.java
│   │   │   ├── MealController.java
│   │   │   ├── OrderController.java
│   │   │   ├── UserController.java
│   │   │   ├── ReviewController.java
│   │   │   └── AdminController.java
│   │   │
│   │   ├── model/                     # MongoDB document models
│   │   │   ├── User.java
│   │   │   ├── Meal.java
│   │   │   ├── Order.java
│   │   │   ├── Review.java
│   │   │   └── enums/
│   │   │       ├── UserRole.java      # CUSTOMER, COOK, ADMIN
│   │   │       ├── OrderStatus.java   # PLACED, ACCEPTED, PREPARING, READY, DELIVERING, DELIVERED, CANCELLED
│   │   │       └── MealCategory.java
│   │   │
│   │   ├── repository/                # MongoDB repositories
│   │   │   ├── UserRepository.java
│   │   │   ├── MealRepository.java
│   │   │   ├── OrderRepository.java
│   │   │   └── ReviewRepository.java
│   │   │
│   │   ├── service/                   # Business logic
│   │   │   ├── AuthService.java
│   │   │   ├── MealService.java
│   │   │   ├── OrderService.java
│   │   │   ├── UserService.java
│   │   │   ├── ReviewService.java
│   │   │   ├── FirebaseNotificationService.java
│   │   │   └── ImageService.java      # ImgBB URL storage (not binary)
│   │   │
│   │   ├── security/                  # JWT filter, provider, user details
│   │   │   ├── JwtTokenProvider.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── CustomUserDetailsService.java
│   │   │
│   │   ├── dto/                       # Data transfer objects
│   │   │   ├── request/
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── RegisterRequest.java
│   │   │   │   ├── CreateMealRequest.java
│   │   │   │   ├── PlaceOrderRequest.java
│   │   │   │   └── SubmitReviewRequest.java
│   │   │   └── response/
│   │   │       ├── AuthResponse.java
│   │   │       ├── MealResponse.java
│   │   │       ├── OrderResponse.java
│   │   │       └── ApiResponse.java
│   │   │
│   │   ├── exception/                 # Global exception handling
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── ResourceNotFoundException.java
│   │   │   └── UnauthorizedException.java
│   │   │
│   │   └── util/                      # Utility classes
│   │       ├── GeoUtils.java          # Haversine distance calculation
│   │       └── DateUtils.java
│   │
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-dev.yml
│   │   └── application-prod.yml
│   │
│   ├── src/test/                      # Unit & integration tests
│   ├── pom.xml
│   └── Dockerfile
│
├── firebase/                          # Firebase config & rules
│   ├── firebase.json
│   ├── firestore.rules
│   └── functions/                     # Cloud Functions (optional)
│
├── .github/
│   └── workflows/
│       ├── ci-mobile.yml              # Mobile CI/CD
│       └── ci-backend.yml             # Backend CI/CD
│
├── .gitignore
├── README.md
└── CONTRIBUTING.md                    # Team workflow, branching strategy
```

### 1.2 Git Branching Strategy (Merge-Conflict Minimization)

| Branch | Purpose | Owner |
|--------|---------|-------|
| `main` | Production-ready code only | Protected (merge via PR) |
| `develop` | Integration branch | All members merge here |
| `feature/mobile-auth` | Auth screens & flows | Member A |
| `feature/mobile-customer` | Customer screens | Member A |
| `feature/mobile-cook` | Cook screens | Member B |
| `feature/mobile-admin` | Admin screens | Member B |
| `feature/backend-auth` | Auth API + JWT | Member C |
| `feature/backend-meals` | Meal CRUD API | Member C |
| `feature/backend-orders` | Order lifecycle API | Member D |
| `feature/backend-admin` | Admin endpoints | Member D |
| `feature/firebase-realtime` | Real-time integration | Members B + C |

**Rules:**
- Each member owns specific directories → minimal file overlap
- Feature branches are short-lived (1–2 weeks max)
- PRs require at least 1 reviewer before merging to `develop`
- `develop` → `main` only after integration testing passes

---

## 🎨 2. UI/UX-First Development Strategy

### 2.1 Design System Foundation

Before writing any screen, we establish a **centralized design token system** in `mobile/src/theme/`:

```typescript
// colors.ts — Premium palette
export const Colors = {
  primary: '#FF6B35',      // Warm orange — appetite, warmth, home
  primaryLight: '#FF8F60',
  primaryDark: '#E04E1A',
  secondary: '#2D6A4F',    // Deep green — freshness, health, organic
  secondaryLight: '#52B788',
  accent: '#FBBF24',       // Golden yellow — highlights, badges
  background: '#FEFEFE',
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  overlay: 'rgba(0, 0, 0, 0.5)',
};
```

### 2.2 React Navigation Role-Based Router Architecture

```
AppNavigator
├── AuthNavigator (unauthenticated)
│   ├── SplashScreen
│   ├── OnboardingScreen (swipeable carousel)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── RoleSelectScreen (Customer / Cook / Admin)
│
├── CustomerNavigator (role === 'CUSTOMER')
│   ├── BottomTab: Home | Search | Orders | Profile
│   ├── Stack: MealDetail → Checkout → OrderConfirmation
│   ├── Stack: CookProfile → CookMeals
│   ├── Stack: OrderTracking (real-time)
│   └── Stack: Favorites, Settings, EditProfile
│
├── CookNavigator (role === 'COOK')
│   ├── BottomTab: Dashboard | Listings | Orders | Earnings
│   ├── Stack: CreateListing → Preview → Publish
│   ├── Stack: OrderDetail → StatusUpdate
│   └── Stack: CookProfile (self-view), Settings
│
└── AdminNavigator (role === 'ADMIN')
    ├── BottomTab: Dashboard | Users | Content | Analytics
    ├── Stack: UserDetail → Actions (Ban/Verify)
    ├── Stack: ListingModeration → Approve/Reject
    └── Stack: DisputeDetail → Resolution
```

### 2.3 Animation & Micro-Interaction Strategy

| Interaction | Library | Effect |
|------------|---------|--------|
| Screen transitions | React Navigation + Reanimated | Shared element transitions for meal cards → detail |
| Pull to refresh | Reanimated | Custom animated header with cooking pot icon |
| Order status timeline | Reanimated | Animated step indicator with pulse on active step |
| Meal card scroll | Reanimated + FlatList | Parallax image effect on scroll |
| Add to favorites | Reanimated | Heart icon spring bounce animation |
| Price counter | Reanimated | Number ticker animation on cart total |
| Loading states | Lottie | Custom cooking-themed skeleton loaders |
| Toast notifications | Reanimated | Slide-in from top with auto-dismiss |

### 2.4 Key Screen Wireframe Specifications

**Customer Home Screen:**
- Location header with current delivery area
- "Good Morning, [Name]" personalized greeting
- Horizontal carousel: "Trending Near You" (top-rated cooks)
- Vertical feed: Available meals (card layout with photo, name, cook avatar, price, rating, distance, prep time)
- Floating filter chip bar: Cuisine | Price | Rating | Distance | Dietary

**Cook Dashboard:**
- Today's summary card: Active orders count, earnings today, pending reviews
- Quick actions: "+ New Listing" | "Pause All" | "View Earnings"
- Active orders list with swipe-to-update-status gestures
- Upcoming pre-orders section

---

## ⚙️ 3. Backend & Database Parallel Development

### 3.1 Spring Boot Architecture

**Tech Stack:**
- Java 17 + Spring Boot 3.x
- Spring Security 6 + JWT (stateless auth)
- Spring Data MongoDB
- Spring Validation (Bean Validation)
- Lombok (boilerplate reduction)
- SpringDoc OpenAPI (Swagger documentation)

**JWT Security Flow:**
```
Client → POST /api/auth/login { email, password }
Server → Validates credentials → Generates JWT (24h expiry) + Refresh Token (30d)
Client → Stores tokens securely (React Native Keychain)
Client → All subsequent requests: Authorization: Bearer <jwt>
Server → JwtAuthenticationFilter intercepts → validates → sets SecurityContext
Server → @PreAuthorize("hasRole('COOK')") on cook-only endpoints
```

### 3.2 MongoDB Schema Design (512MB Optimized)

**Strategy for 512MB Limit:**
1. **No binary image storage** — All images uploaded to ImgBB; only URLs stored in MongoDB
2. **Embed small, reference large** — Reviews embedded in Meal (capped at last 20); Orders reference User/Meal by ID
3. **TTL indexes** — Auto-delete completed orders older than 90 days
4. **Capped collections** — Notifications collection capped at 5MB
5. **Selective field projection** — API queries return only needed fields

```javascript
// User Document (~0.5KB per user)
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  role: "CUSTOMER" | "COOK" | "ADMIN",
  profile: {
    name: String,
    phone: String,
    avatarUrl: String,       // ImgBB URL
    bio: String,             // Cook only
    kitchenPhotos: [String], // ImgBB URLs, max 3
    hygieneVerified: Boolean,
    location: {
      type: "Point",
      coordinates: [lng, lat]
    },
    deliveryRadius: Number   // km, cook only
  },
  stats: {                   // Denormalized for performance
    totalOrders: Number,
    avgRating: Number,
    totalEarnings: Number    // Cook only
  },
  favorites: [ObjectId],     // Customer only, refs to User (cook IDs)
  createdAt: ISODate,
  updatedAt: ISODate
}

// Meal Document (~0.8KB per meal)
{
  _id: ObjectId,
  cookId: ObjectId,          // ref → User
  name: String,
  description: String,
  photos: [String],          // ImgBB URLs, max 4
  price: Number,
  category: String,
  cuisineType: String,
  ingredients: [String],
  allergenTags: [String],    // "dairy", "nuts", "gluten", etc.
  portionLimit: Number,
  portionsRemaining: Number,
  availability: {
    days: ["MON","TUE","WED","THU","FRI"],
    mealType: "LUNCH" | "DINNER" | "BREAKFAST",
    cutoffTime: String,      // "09:00" — pre-order cutoff
    servingTime: String      // "12:00"
  },
  isActive: Boolean,
  recentReviews: [{          // Embedded, capped at 20
    userId: ObjectId,
    userName: String,
    rating: Number,
    comment: String,
    createdAt: ISODate
  }],
  avgRating: Number,
  totalOrders: Number,
  createdAt: ISODate,
  updatedAt: ISODate
}

// Order Document (~0.6KB per order)
{
  _id: ObjectId,
  orderNumber: String,       // Human-readable: "NP-20260115-0042"
  customerId: ObjectId,
  cookId: ObjectId,
  meals: [{
    mealId: ObjectId,
    name: String,            // Snapshot at order time
    price: Number,
    quantity: Number
  }],
  totalAmount: Number,
  platformFee: Number,
  cookEarnings: Number,
  status: "PLACED" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERING" | "DELIVERED" | "CANCELLED",
  statusHistory: [{
    status: String,
    timestamp: ISODate
  }],
  deliveryMethod: "PICKUP" | "COOK_DELIVERY" | "RIDER",
  deliveryAddress: {
    label: String,
    coordinates: [lng, lat]
  },
  scheduledFor: ISODate,     // Pre-order target time
  specialInstructions: String,
  createdAt: ISODate,
  updatedAt: ISODate,
  ttl: ISODate               // TTL index: auto-delete after 90 days
}
```

**Estimated Storage:**
| Collection | Docs (Year 1) | Avg Size | Total |
|-----------|---------------|----------|-------|
| Users | 500 | 0.5 KB | 0.25 MB |
| Meals | 200 | 0.8 KB | 0.16 MB |
| Orders (with TTL) | ~10,000 active | 0.6 KB | 6 MB |
| Indexes | — | — | ~5 MB |
| **Total** | | | **~12 MB** |

> Comfortable within 512 MB. Even at 10x scale, we stay under 120 MB.

### 3.3 ImgBB Integration Strategy

```
Flow:
1. User picks image → React Native Image Picker
2. Client-side compression → react-native-image-resizer
   - Max dimensions: 800x800px
   - Quality: 70%
   - Format: JPEG
   - Target: < 200KB per image
3. Base64 encode → POST to ImgBB API (client-side, free tier)
4. ImgBB returns URL → Send URL to Spring Boot API
5. Spring Boot stores only the URL string in MongoDB

Benefits:
- Zero image storage in MongoDB
- ImgBB free tier: unlimited uploads, 32MB max per image
- Client-side compression reduces upload time on slow networks
- CDN-served images via ImgBB for fast loading
```

### 3.4 Core API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/refresh` | Public | Refresh JWT |
| GET | `/api/meals` | Customer | List meals (filtered, paginated) |
| GET | `/api/meals/{id}` | Customer | Meal detail with reviews |
| POST | `/api/meals` | Cook | Create meal listing |
| PUT | `/api/meals/{id}` | Cook | Update meal listing |
| DELETE | `/api/meals/{id}` | Cook | Deactivate listing |
| POST | `/api/orders` | Customer | Place order |
| GET | `/api/orders/my` | Both | Get user's orders |
| PUT | `/api/orders/{id}/status` | Cook | Update order status |
| POST | `/api/reviews` | Customer | Submit review |
| GET | `/api/users/profile` | Both | Get own profile |
| PUT | `/api/users/profile` | Both | Update profile |
| GET | `/api/cooks/{id}` | Customer | View cook profile |
| GET | `/api/cooks/nearby` | Customer | Cooks within radius |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/{id}/verify` | Admin | Verify cook |
| GET | `/api/admin/analytics` | Admin | Platform metrics |

---

## 🔥 4. Real-Time Integration (Firebase)

### 4.1 Firebase Services Used

| Service | Purpose |
|---------|---------|
| Firebase Cloud Messaging (FCM) | Push notifications for order updates |
| Firebase Realtime Database | Live order status tracking |
| Firebase Authentication | Optional social login (Google Sign-In) |

### 4.2 Real-Time Order Tracking Architecture

```
Firebase Realtime Database Structure:
/orders/{orderId}/
  ├── status: "PREPARING"
  ├── lastUpdated: 1737900000000
  ├── cookLocation: { lat: 6.9271, lng: 79.8612 }  // If cook-delivery
  └── estimatedReady: 1737901800000

Flow:
1. Cook taps "Start Preparing" in app
2. App calls Spring Boot: PUT /api/orders/{id}/status { status: "PREPARING" }
3. Spring Boot updates MongoDB AND writes to Firebase RTDB
4. Customer's app has active Firebase listener on /orders/{orderId}/
5. Customer sees real-time status change → UI updates animated timeline
6. Push notification sent via FCM: "Your cook has started preparing your meal!"
```

### 4.3 Notification Matrix

| Event | Recipient | Channel | Message |
|-------|-----------|---------|---------|
| New order placed | Cook | Push + In-app | "New order! [Customer] ordered [Meal]. Tap to accept." |
| Order accepted | Customer | Push | "Your order has been accepted by [Cook]!" |
| Preparation started | Customer | Push + RTDB | "Your cook has started preparing your meal." |
| Order ready | Customer | Push + RTDB | "Your meal is ready for pickup/delivery!" |
| Out for delivery | Customer | Push + RTDB | "Your meal is on its way!" |
| Order delivered | Both | Push | "Order delivered. Rate your experience!" |
| New review received | Cook | In-app | "[Customer] rated your meal ⭐ 4.5" |
| Order cancelled | Both | Push | "Order #NP-XXX has been cancelled." |

---

## 🏆 5. The Gold Endpoint: Production Build & Play Store Strategy

### 5.1 Android App Bundle (AAB) Build Pipeline

```bash
# 1. Environment Setup
# Target: API Level 36 (Android 16)
# Min SDK: 24 (Android 7.0 — covers 97%+ devices)

# 2. Build Configuration (android/app/build.gradle)
android {
    compileSdkVersion 36
    defaultConfig {
        applicationId "com.neighborplates"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    bundle {
        language { enableSplit = true }
        density { enableSplit = true }
        abi { enableSplit = true }
    }
}

# 3. Build the AAB
cd mobile/android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### 5.2 Pre-Launch Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Generate signed upload keystore (store securely, never commit) | ⬜ |
| 2 | Configure ProGuard rules for React Native + Firebase | ⬜ |
| 3 | Create Play Console developer account ($25 one-time fee) | ⬜ |
| 4 | Prepare store listing: App name, short/long descriptions, screenshots (8+), feature graphic | ⬜ |
| 5 | Complete Data Safety form (declare data types collected) | ⬜ |
| 6 | Set content rating via IARC questionnaire | ⬜ |
| 7 | Create privacy policy page (hosted on GitHub Pages or Firebase Hosting) | ⬜ |
| 8 | Set up Firebase Crashlytics for crash reporting | ⬜ |
| 9 | Test AAB locally via `bundletool` before upload | ⬜ |
| 10 | Configure app signing by Google Play (App Signing key) | ⬜ |

### 5.3 14-Day Closed Testing Strategy

```
Day 1-2:   Upload AAB to Internal Testing Track (up to 100 testers)
           → Immediate access, no review required
           → Team members + close friends test core flows
           → Focus: Crash detection, critical path testing

Day 3-4:   Fix critical bugs found in internal testing
           → Rebuild and re-upload AAB

Day 5:     Promote to Closed Testing Track (Alpha)
           → Add 20 testers via email list (diverse demographics)
           → Provide structured testing checklist:
              ✅ Register as Customer → Browse → Order → Track → Review
              ✅ Register as Cook → Create Listing → Accept Order → Update Status
              ✅ Test on different screen sizes and Android versions
              ✅ Test on slow network (3G)

Day 5-10:  Collect feedback via Google Form + in-app feedback button
           → Monitor Crashlytics for stability metrics
           → Target: < 1% crash rate, < 3s cold start

Day 11-12: Address feedback, fix bugs, polish UI
           → Second AAB upload to Closed Testing

Day 13:    Final round of verification testing
           → Confirm all critical paths work end-to-end
           → Verify no ANR (Application Not Responding) issues

Day 14:    Decision gate:
           → If stable → Prepare for Open Testing or Production release
           → If issues remain → Extend closed testing by 7 days
```

### 5.4 Post-Launch Monitoring

| Metric | Tool | Target |
|--------|------|--------|
| Crash-free rate | Firebase Crashlytics | > 99.5% |
| ANR rate | Play Console Vitals | < 0.5% |
| Cold start time | Firebase Performance | < 3 seconds |
| API response time | Spring Boot Actuator | < 500ms (p95) |
| User retention (D7) | Firebase Analytics | > 30% |
| Play Store rating | Play Console | > 4.0 ⭐ |

---

## 👥 Team Responsibility Matrix

| Member | Primary Domain | Secondary Domain |
|--------|---------------|-----------------|
| **A** | Mobile: Auth + Customer screens | Design system, wireframes |
| **B** | Mobile: Cook + Admin screens | Firebase integration |
| **C** | Backend: Auth + Meals API | Firebase RTDB bridge |
| **D** | Backend: Orders + Admin API | AAB build, Play Store |

---

*This implementation plan is designed to be executed after Assignment 1 approval. No code will be generated until the command is given.*
