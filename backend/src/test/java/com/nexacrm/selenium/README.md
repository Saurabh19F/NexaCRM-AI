# NexaCRM Selenium UI Tests

## Prerequisites

1. **Google Chrome** installed on your machine
2. **Java 21** and **Maven** available
3. Both the **backend** (Spring Boot on port 8080) and **frontend** (Vite on port 5173) running

## Quick Start

### 1. Start the backend
```bash
cd backend
mvn spring-boot:run
```

### 2. Start the frontend
```bash
cd frontend
npm run dev
```

### 3. Run the Selenium tests

**Option A — via Maven profile:**
```bash
cd backend
mvn test -Pselenium
```

**Option B — via Failsafe (integration-test phase):**
```bash
cd backend
mvn verify
```

**Option C — run a single test class:**
```bash
cd backend
mvn test -Pselenium -Dtest=LoginPageTest
```

## Configuration

Set via environment variables or `-D` system properties:

| Variable               | Default                  | Description              |
|------------------------|--------------------------|--------------------------|
| `NEXACRM_BASE_URL`    | `http://localhost:5173`  | Frontend URL             |
| `NEXACRM_HEADLESS`    | `true`                   | Run Chrome headless      |
| `NEXACRM_TEST_EMAIL`  | `admin@nexacrm.com`     | Login email for tests    |
| `NEXACRM_TEST_PASSWORD`| `admin123`              | Login password for tests |

### Run with browser visible (non-headless):
```bash
mvn test -Pselenium -DNEXACRM_HEADLESS=false
```

### Run against a deployed instance:
```bash
mvn test -Pselenium -DNEXACRM_BASE_URL=https://crm.example.com
```

## Test Classes

| Class              | What it tests                                      |
|--------------------|----------------------------------------------------|
| `LoginPageTest`    | Login form elements, validation, links, pwd toggle |
| `AuthFlowTest`     | Login success/failure, redirects, session handling  |
| `NavigationTest`   | Sidebar nav to all CRM pages after login           |
| `ResponsiveTest`   | Layout on mobile, tablet, and desktop viewports    |

## Notes

- WebDriverManager auto-downloads the correct ChromeDriver — no manual install needed.
- Selenium tests are **excluded** from `mvn test` by default (they only run with `-Pselenium` or `mvn verify`).
- For CI/CD, use `NEXACRM_HEADLESS=true` (the default).
