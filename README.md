# 📝 Faculty Report Generator — CMRIT

A modern web application for **CMR Institute of Technology** faculty to automate the generation of **Flipped Classroom** and **Video Session** reports. Built with a plug-and-play AI architecture ready for **Gemma** (or any OpenAI-compatible model) integration.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![AI](https://img.shields.io/badge/AI-Gemma%20Ready-blueviolet)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

### Core Functionality
- **Multi-step Report Form** — Guided 5-step wizard for creating reports
- **Flipped Classroom Reports** — 5 subtypes supported:
  - Standard Inverted Flipped Classroom (FP)
  - Discussion Oriented FP
  - Demonstration Focused FP
  - Group Based FP
  - Flipping the Teacher
- **Video Session Reports** — With duration, video links, and learning outcomes
- **Dual Format Export** — Download reports as **Word (.docx)** or **PDF**
- **Photo Upload** — Upload classroom/session photos directly to cloud storage
- **Analytics Dashboard** — Track reports generated, views, format breakdowns, and 7-day activity charts

### 🤖 AI-Ready Architecture (Gemma Integration)
- **Plug-and-play AI layer** — Connect your self-hosted Gemma model with just 1 environment variable
- **AI Assist buttons** throughout the form:
  - 📝 **Auto-generate conduction writeups** — Based on topic, subtype, and materials
  - ❓ **Generate evaluation questions** — With Bloom's taxonomy levels
  - 🎯 **Suggest POs/PSOs** — Based on topic, course, and department
  - 📚 **Generate learning outcomes** — Using Bloom's taxonomy verbs
  - 📊 **Analyze quiz performance** — Summary and improvement suggestions
- **Real-time AI status indicator** — Shows connection status (Connected/Offline/Not Configured)
- **Preview & Apply workflow** — Review AI-generated content before inserting into form
- **Works without AI** — All features fully functional without AI; AI just enhances productivity

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                   Frontend (React)                │
│  Multi-step Form → AI Assist Buttons → Download  │
└──────────────┬──────────────┬────────────────────┘
               │              │
       ┌───────▼───────┐  ┌──▼──────────────────┐
       │  Report API   │  │   AI API (Optional)  │
       │  /api/generate │  │  /api/ai/generate    │
       │  -report      │  │  /api/ai/health      │
       └───────┬───────┘  └──────┬───────────────┘
               │                 │
       ┌───────▼───────┐  ┌──────▼───────────────┐
       │  DOCX/PDF Gen │  │  Your Gemma Server   │
       │  (docx lib +  │  │  (Ollama / vLLM /    │
       │   HTML2PDF)   │  │   TGI / LM Studio)   │
       └───────────────┘  └──────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Yarn
- PostgreSQL database
- (Optional) Self-hosted Gemma model for AI features

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/faculty-report-generator.git
cd faculty-report-generator

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other settings

# Generate Prisma client
yarn prisma generate

# Push database schema
yarn prisma db push

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🤖 Gemma Integration Guide

The app is designed to work with **any OpenAI-compatible API endpoint**. Here are the recommended ways to self-host Gemma:

### Option 1: Ollama (Recommended — Easiest Setup)

```bash
# Install Ollama (https://ollama.com)
curl -fsSL https://ollama.com/install.sh | sh

# Pull Gemma model
ollama pull gemma2:2b     # Lighter, faster (recommended for most cases)
# or
ollama pull gemma2:9b     # More capable, needs more RAM/GPU

# Ollama automatically serves an OpenAI-compatible API at localhost:11434
```

Then set in your `.env`:
```env
AI_ENDPOINT=http://localhost:11434/v1
AI_MODEL=gemma2:2b
```

### Option 2: vLLM (Best for Production)

```bash
pip install vllm

# Serve Gemma with OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
  --model google/gemma-2-2b-it \
  --port 8000
```

```env
AI_ENDPOINT=http://your-server:8000/v1
AI_MODEL=google/gemma-2-2b-it
```

### Option 3: LM Studio (Desktop GUI)

1. Download [LM Studio](https://lmstudio.ai)
2. Search and download "Gemma 2 2B" or "Gemma 2 9B"
3. Start the local server (it provides an OpenAI-compatible endpoint)
4. Set the endpoint in `.env`

### Option 4: Hugging Face TGI

```bash
docker run --gpus all -p 8080:80 \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id google/gemma-2-2b-it
```

```env
AI_ENDPOINT=http://localhost:8080/v1
AI_MODEL=google/gemma-2-2b-it
```

### Hardware Requirements

| Model | Min RAM | GPU VRAM | Response Time |
|-------|---------|----------|---------------|
| Gemma 2B | 8GB | 4GB+ (or CPU) | 2-10s |
| Gemma 7B/9B | 16GB | 8GB+ | 3-15s |
| Gemma 27B | 32GB | 16GB+ | 5-30s |

> **Tip:** For a college server setup, Ollama + Gemma 2B on a machine with 8GB RAM works well for moderate usage.

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Application URL (e.g., `http://localhost:3000`) |
| `AI_ENDPOINT` | No | Gemma API endpoint (e.g., `http://localhost:11434/v1`) |
| `AI_MODEL` | No | Model name (default: `gemma2:2b`) |
| `AI_API_KEY` | No | API key if your endpoint requires authentication |
| `AWS_BUCKET_NAME` | Yes | S3 bucket for photo uploads |
| `AWS_FOLDER_PREFIX` | Yes | S3 folder prefix |

---

## 📁 Project Structure

```
nextjs_space/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── health/route.ts    # AI health check endpoint
│   │   │   └── generate/route.ts  # AI content generation endpoint
│   │   ├── analytics/route.ts     # Analytics tracking
│   │   ├── generate-report/route.ts # Report generation (DOCX/PDF)
│   │   └── upload/presigned/route.ts # S3 presigned URL generation
│   ├── analytics/page.tsx         # Analytics dashboard page
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── components/
│   ├── ai-assist-button.tsx       # Reusable AI generation button
│   ├── ai-status-badge.tsx        # AI connection status indicator
│   ├── analytics-chart.tsx        # 7-day activity chart
│   ├── analytics-dashboard.tsx    # Analytics overview
│   ├── header.tsx                 # App header/nav
│   ├── hero-section.tsx           # Landing hero section
│   ├── footer.tsx                 # App footer
│   └── report-form-wrapper.tsx    # Main multi-step form
├── hooks/
│   ├── use-ai.ts                  # AI hook (health check + generation)
│   └── use-toast.ts               # Toast notifications
├── lib/
│   ├── ai-service.ts              # ⭐ AI abstraction layer (Gemma-ready)
│   ├── aws-config.ts              # S3 configuration
│   ├── prisma.ts                  # Database client
│   ├── s3.ts                      # S3 utilities
│   ├── types.ts                   # TypeScript interfaces
│   └── utils.ts                   # Utility functions
├── prisma/
│   └── schema.prisma              # Database schema
└── data/
    ├── flipped-class-template.docx
    └── video-session-template.docx
```

---

## 🔌 API Reference (for Future Mobile App)

All API routes are RESTful and return JSON.

### `POST /api/generate-report`
Generate a report in DOCX or PDF format.

```json
{
  "formData": {
    "sessionType": "flipped_class",
    "academicYear": "2024-25",
    "department": "Computer Science",
    "subjectCode": "CS301",
    "courseName": "Data Structures",
    "semesterSection": "III A",
    "preparedBy": "Dr. John Doe",
    "curriculumGapIdentified": "Advanced tree balancing",
    "sessions": [...],
    "detailedEntries": [...]
  },
  "format": "docx"
}
```
**Response:** Binary file (application/octet-stream)

### `POST /api/upload/presigned`
Get a presigned URL for uploading photos.

```json
{
  "fileName": "classroom.jpg",
  "contentType": "image/jpeg",
  "isPublic": true
}
```
**Response:**
```json
{
  "uploadUrl": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2Nob29sJTIwY2xhc3Nyb29tfGVufDB8fDB8fHww",
  "cloud_storage_path": "uploads/classroom.jpg"
}
```

### `GET /api/ai/health`
Check AI service status.

**Response:**
```json
{
  "configured": true,
  "available": true,
  "model": "gemma2:2b",
  "endpoint": "http://localhost:11434/v1"
}
```

### `POST /api/ai/generate`
Generate AI content.

```json
{
  "action": "conduction_writeup",
  "params": {
    "topic": "Binary Search Trees",
    "subtype": "Discussion Oriented FP",
    "totalStudents": "60",
    "materialsShared": "PPT slides, YouTube video link"
  }
}
```
**Actions:** `conduction_writeup`, `evaluation_questions`, `pos_psos`, `learning_outcomes`, `performance_analysis`

### `GET /api/analytics`
Get analytics data.

### `POST /api/analytics`
Record an analytics event.

```json
{
  "type": "report_generated",
  "format": "docx",
  "sessionType": "flipped_class"
}
```

---

## 🛡️ Data Privacy

- **No data sent to external LLMs** — When using Gemma, all AI processing happens on YOUR server
- **No report storage** — Reports are generated on-the-fly and downloaded directly; nothing is persisted
- **Photos** — Stored in your own S3 bucket (your infrastructure)
- **Analytics** — Only aggregate counts stored (views, report counts); no personal data

---

## 📊 Analytics

The built-in analytics dashboard tracks:
- Total page views
- Total reports generated
- Reports by format (DOCX vs PDF)
- Reports by session type (Flipped Class vs Video Session)
- 7-day activity chart

Access at `/analytics`.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- CMR Institute of Technology
- Google Gemma — Open-source AI model
- Ollama — Easy local LLM hosting
