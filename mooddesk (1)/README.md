# ⚡ MoodDesk — Mood-Based Productivity Assistant

Welcome to **MoodDesk**, an innovative, intelligent workspace that adapts to *how you feel*. By analyzing your thoughts, feelings, or daily reflections, MoodDesk dynamically calibrates your productivity dashboard—changing visual styling, generating custom checklists, and recommending workflow states tailored exactly to your emotional bandwidth.

Developed with a desktop-ready **Bento Grid** layout, MoodDesk bridges the gap between Emotional Intelligence (EQ) and daily performance, perfect for students, developers, and professionals alike.

---

## 🎨 Design Theme & Identity
MoodDesk implements a high-fidelity **Bento Grid layout** with premium typography, fluid motion transitions, and generous negative space. It supports five distinct atmospheric states:
*   **☀️ Happy**: A bright, energizing space featuring warm amber tones and upbeat background audio recommendations.
*   **🌊 Sad**: A cozy, supportive visual theme with slow piano melodies, comforting advice, and low-cognitive tasks.
*   **🧘 Stressed**: A pastel rose interface focusing on breathing, stress relief, and actionable micro-milestones.
*   **☕ Neutral**: A clean, balanced, high-contrast slate aesthetic for standard workflow routines.
*   **⚡ Motivated**: A dynamic emerald-grade interface designed to help you crush high-priority objectives.

---

## 🌟 Key Features

*   **🧠 Intelligent Mood Analysis**: Input your thoughts in the *Mental Check-in* block. Our custom-built system parses emotional indicators, scoring text against five mood categories.
*   **✨ Interactive Bento Grid Dashboard**: Content is organized into clean, responsive container block cells modeled after modern layout styles.
*   **⚙️ 3 Workflow Modes**:
    *   **Focus Mode**: Complete deep work sprints using the dynamic Pomodoro Matrix Timer.
    *   **Recovery Mode**: De-escalate stress with an interactive, animated Diaphragmatic Breathing guide.
    *   **Planning Mode**: Assemble routines using custom, actionable checklists that adapt to your detected workload.
*   **📂 Persistent Local History**: Log your mood over time. Historical check-ins are saved securely to your browser's local storage.
*   **🔥 Daily Streak Counter**: Tracks consecutive day check-ins to encourage reflective journaling habit loops.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: React 19, TypeScript, Vite
*   **Animations**: `motion` for fluid visual entrances and status transforms
*   **Icons**: Named vector icons via `lucide-react`
*   **Styling**: Custom Tailwind CSS utilities with a desktop-focused aesthetic
*   **Database & Storage**: Client-side standard `localStorage` key-value persistence
*   **Deployment**: Pre-configured for seamless hosting on **Vercel**

---

## 🔬 How the Mood Engine Works

MoodDesk utilizes a customizable, deterministic rule-based Natural Language Processing (NLP) algorithm:
1. **Normalization**: The raw text input is parsed, stripped of punctuation, and tokenized into lowercase components.
2. **Keyword Mapping**: Text tokens are cross-referenced with a comprehensive emotional dictionary containing valence scores for each of the 5 target moods.
3. **Weight Analysis**: Mood weights are calculated based on frequency, intensity, and contextual priority modifiers.
4. **Resolution**: The engine outputs the dominant mood alongside an analytical confidence score.

---

## 📂 Project Structure

```text
├── src/
│   ├── App.tsx             # Primary Workspace Frame containing the Bento grid cells
│   ├── main.tsx            # React application mounting entry-point
│   ├── index.css           # Styling directives, font-imports, and Tailwind configs
│   ├── moodEngine.ts       # Sentiment NLP mapping algorithms & word lexicons
│   └── types.ts            # Standard TypeScript structures & Mood classification schema
├── index.html              # Core application HTML container
├── package.json            # Node.js module management schema
└── README.md               # Project documentation
```

---

## 🚀 Installation & Local Development

Set up and run MoodDesk on your local machine in three simple steps:

### 1. Clone the repository and navigate to the root directory:
```bash
git clone https://github.com/your-username/mooddesk.git
cd mooddesk
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Run the development environment:
```bash
npm run dev
```
Open your browser to [http://localhost:3000](http://localhost:3000) (or the port specified in your console) to view the workspace!

### 4. Build for production:
```bash
npm run build
```

---

## ☁️ Deployment

MoodDesk is optimized for production deployment on **Vercel**:

1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Connect your GitHub repository to Vercel.
3. Configure the **Build & Development Settings**:
   *   **Framework Preset**: Vite
   *   **Build Command**: `npm run build`
   *   **Output Directory**: `dist`
4. Click **Deploy**. Vercel will build your static files and supply a global URL.

---

## 🔮 Future Improvements

*   **📊 Historic Mood Trends**: Analytical charts tracking emotional fluctuations over weekly and monthly windows.
*   **🎵 Integrated Audio Streamer**: Real-time ambient music streams matching the active atmosphere without requiring external tabs.
*   **🔄 Cloud Synchronization**: Hybrid persistence syncing local storage snapshots to secure accounts (such as Firebase).

---

## ✍️ Author & Credits

*   **Sritejaswi** — [GitHub](https://github.com/sritejaswi30)
*   Crafted for academic evaluation and professional internship application.
