# Annotiq - AI Meeting Intelligence Platform

Annotiq is a multi-tenant SaaS platform that uses AI to transcribe, diarize, and analyze meetings. It provides semantic search, automated action item extraction, and organization-level data isolation.

## 🚀 Project Structure

- **/backend**: FastAPI application with SQLAlchemy (PostgreSQL/Supabase) and pgvector.
- **/frontend**: Next.js 14 App Router, Tailwind CSS, and Zustand.
- **/workers**: Celery workers for asynchronous transcription and processing tasks.
- **/infra**: Docker and environment configurations.

---

## 🛠️ Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Redis**: Required for Celery task queuing.
- **Supabase**: A PostgreSQL database with `pgvector` enabled.

---

## 🏗️ Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and configure `.env`**:
   Copy `.env.example` to `.env` and fill in your credentials.
   ```bash
   # Essential keys
   DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://[REF].supabase.co
   SUPABASE_ANON_KEY=...
   ```

   > [!IMPORTANT]
   > **Supabase Connection**: If you encounter a `getaddrinfo failed` error, it is likely because your Supabase project is IPv6-only. Use the **Connection Pooling** URL (port 6543) from your Supabase settings to connect via IPv4.

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the API server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

---

## 💻 Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Configure `.env.local`**:
   Ensure the following variable is set:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

---

## 🧪 Running Tests

### Backend Tests
Integration tests require a database. By default, they will use an in-memory SQLite database for basic logic, but specialized search tests require PostgreSQL.
```bash
cd backend
python -m pytest
```

### Frontend Tests
We use Jest and React Testing Library.
```bash
cd frontend
npm run test
```

---

## 📝 Design & Aesthetics

Annotiq uses a premium "Slate & Indigo" design system:
- **Background**: Slate-900 (Deep Dark)
- **Primary Accent**: Indigo-600
- **Typography**: Inter (Google Fonts)
- **Icons**: Lucide React

## 📄 License
This project is for internal use only.
