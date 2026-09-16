# 🎓 Vidya Setu – AI Study Assistant

> "Every subject is isolated, every chat is remembered, and every line of PDF is searchable."

---

## 📁 Folder Structure

```
vidya_setu/
├── app.py               ← Flask backend (all API routes)
├── engine.py            ← Core retrieval engine + chat memory
├── requirements.txt     ← Dependencies (Flask only)
├── data/
│   ├── python.json      ← Structured Python knowledge base (18 topics)
│   ├── dbms.json        ← Structured DBMS knowledge base (17 topics)
│   ├── python_pdf.json  ← 2507 lines extracted from Python PDF
│   └── dbms_pdf.json    ← 5015 lines extracted from DBMS PDF
└── templates/
    └── index.html       ← Full frontend UI
```

---

## 🚀 How to Run

### 1. Install dependencies
```bash
pip install flask
```

### 2. Start the server
```bash
cd vidya_setu
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

---

## 🌐 API Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /health               | Health check             |
| POST   | /new_chat             | Start a new chat session |
| POST   | /chat                 | Ask a question           |
| GET    | /history/<chat_id>    | Get chat history         |
| GET    | /chats                | List all chat IDs        |
| POST   | /delete_chat/<id>     | Delete a chat            |
| GET    | /topics?subject=DBMS  | List topics for subject  |

### POST /chat
**Request:**
```json
{
  "question": "What is normalization?",
  "chat_id": "abc123"
}
```
**Response:**
```json
{
  "answer": "📚 Normalization...",
  "subject": "DBMS",
  "source": "structured",
  "response_time_ms": 2.1,
  "chat_id": "abc123"
}
```

---

## 🧠 Architecture

```
User Question
    │
    ├── Greeting check (rule-based) → instant response
    │
    ├── Subject Detection (keyword scoring)
    │       Python keywords: list, function, loop, class, dict...
    │       DBMS keywords: transaction, normalization, SQL, join...
    │
    ├── Tokenize query
    │
    ├── Stage 1: Keyword match on structured JSON topics (O(1) lookup)
    │       → Returns definition, key points, example, simple explanation
    │
    ├── Stage 2: TF-IDF search over PDF records (inverted index)
    │       → Returns top relevant lines from course PDFs
    │
    └── Stage 3: "Not found" message if both fail
```

---

## ✅ Features

- **Subject Isolation**: Python and DBMS are completely separate pipelines
- **Greeing Handling**: "hi", "hello", "thanks" → friendly responses
- **Context Memory**: Last subject remembered across questions
- **Multi-Chat**: Multiple chat sessions with history
- **Structured Answers**: Definition + Key Points + Example + Simple Words
- **PDF Coverage**: All 7,500+ lines from uploaded PDFs are indexed and searchable
- **Sub-second response**: In-memory TF-IDF, no heavy models
- **No APIs, No LLM, Fully local**: Runs on 2GB RAM

---

## 📊 Data Coverage

| Subject | Structured Topics | PDF Lines Indexed |
|---------|------------------|-------------------|
| Python  | 18 topics        | 2,507 lines       |
| DBMS    | 17 topics        | 5,015 lines       |

---

## 🖥️ System Requirements

- Python 3.10+
- Flask 3.x
- RAM: 256MB minimum (entire dataset is in-memory)
- No GPU required
- Works offline
