# Creativa Backend

This is the backend for the **Creativa** platform, built with **Node.js (Express)** following **Hexagonal Architecture (Ports and Adapters)**. It handles authentication, AI-powered image generation (via Google Gemini), and RAG-based document ingestion.

## 1. Project Overview

*   **Framework:** Express.js (Node.js)
*   **Architecture:** Hexagonal (Clean Architecture)
    *   **Application:** Use Cases, Ports (Interfaces)
    *   **Domain:** Entities (Core Business Logic)
    *   **Infrastructure:** Adapters (Web, Persistence, External Services)
*   **Database & Auth:** Supabase (PostgreSQL, GoTrue)
*   **AI Integration:** Google Vertex AI / Gemini (Image Generation, Embeddings)
*   **Storage:** Google Cloud Storage (GCS)
*   **Module System:** ES Modules (`type: "module"` in `package.json`)

## 2. Directory Structure

```text
src/
├── application/           # Business Logic
│   ├── ports/             # Interfaces (Contracts) for infrastructure
│   └── use-cases/         # Application specific business rules
├── domain/                # Enterprise Logic
│   └── entities/          # Core domain objects
└── infrastructure/        # Implementation details
    ├── external-services/ # Adapters for external APIs (Gemini, GCP)
    ├── persistence/       # Database adapters (Supabase)
    └── web/               # Web framework (Express, Controllers, Routes)
```

## 3. Getting Started

### Prerequisites
*   Node.js >= 18 (LTS recommended)
*   npm >= 9
*   Google Cloud Project (Vertex AI + Storage enabled)
*   Supabase Project

### Installation
1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Setup:**
    *   Copy `.env.example` to `.env`.
    *   Fill in the required variables (Supabase URL/Key, Google Cloud Credentials).
    *   *Note:* See `docs/ENV.md` for detailed variable descriptions.

### Running the Application
*   **Development (Watch Mode):**
    ```bash
    npm run dev
    ```
    Starts the server at `http://localhost:3000` with hot reloading.

*   **Production:**
    ```bash
    npm start
    ```

*   **Testing:**
    ```bash
    npm test
    ```
    Runs Jest test suite (with experimental VM modules for ESM support).

## 4. Development Conventions

*   **Architecture Compliance:**
    *   **Dependencies Rule:** Source code dependencies can only point *inwards*.
    *   `Infrastructure` -> `Application` -> `Domain`.
    *   **Adapters:** Implement interfaces defined in `application/ports`.
    *   **Use Cases:** Orchestrate logic using Ports; do not depend directly on Infrastructure.

*   **Coding Style:**
    *   **ES Modules:** Use `import` and `export` statements.
    *   **Classes:** Use classes for Use Cases, Adapters, and Entities.
    *   **Private Members:** Use `#` for private methods/fields in classes (e.g., `#prepareContent` in `GeminiImageAdapter`).
    *   **Async/Await:** Prefer `async/await` over callbacks/promises.

*   **Key Files:**
    *   `src/infrastructure/web/server.js`: Application entry point.
    *   `src/application/use-cases/images/GenerateImagesUseCase.js`: Example of business logic.
    *   `src/infrastructure/external-services/gemini/GeminiImageAdapter.js`: Example of an external service adapter.

## 5. Deployment

*   **Platform:** Compatible with any Node.js runtime (Docker, Cloud Run, App Engine).
*   **Considerations:** Ensure environment variables are correctly set in the production environment.
