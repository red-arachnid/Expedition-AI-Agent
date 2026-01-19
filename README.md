# Expedition AI | Intelligent Travel Planner 🌍✈️

Expedition AI is a full-stack web application that serves as an intelligent travel agent. It allows users to pick any destination on a world map and receive a customized, AI-generated travel itinerary complete with hotel recommendations, points of interest, and a downloadable PDF schedule.

## ✨ Key Features

- **Interactive Global Mapping:** Integrated with **Leaflet.js** for seamless location selection via map clicks or search queries.
- **AI-Powered Itineraries:** Utilizes **Google Gemini 1.5 Flash** to generate structured travel plans based on user-defined vibes (Adventure, Luxury, etc.), budget, and dates.
- **Dynamic Visual Discovery:** Automatically fetches representative destination images via the **Wikipedia API** upon selection.
- **Real-Time Currency Conversion:** Fetches live exchange rates from the **Open Exchange Rates API** to allow users to plan in their preferred currency.
- **XP Bot Companion:** A reactive AI assistant that provides witty commentary, handles error states, and guides users through the planning process with custom animations.
- **Professional PDF Export:** Generates branded, printer-friendly PDF itineraries using the **FPDF** library.
- **Smart Reverse Geocoding:** Uses **Geoapify** to translate map coordinates into human-readable locations and detects invalid selections like oceans or wilderness areas.

## 🛠️ Technical Stack

- **Backend:** Python (Flask)
- **AI Engine:** Google Generative AI (Gemini API)
- **Frontend:** JavaScript (ES6+), HTML5, Tailwind CSS
- **Mapping:** Leaflet.js & Nominatim
- **External APIs:** Geoapify (Geocoding), Wikipedia (Images), Open-ER (Currency)

## 📁 Project Structure

- `app.py`: The core Flask server handling API routes, Gemini integration, and location logic.
- `pdf_handler.py`: Specialized module for PDF generation and server-side cache management.
- `static/js/main.js`: Manages map initialization, search functionality, and UI state transitions.
- `static/js/xp_bot.js`: Controls the "XP Bot" animations, dialogue loops, and user interaction feedback.
- `_pdfcache/`: Temporary directory for generated itineraries (managed by `CleanCache`).

## 🚀 Getting Started

### Prerequisites
- Python 3.x
- A Google Gemini API Key
- A Geoapify API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/red-arachnid/Expedition-AI-Agent.git
   cd Expedition-AI-Agent

2. **Set up environment variables: Create a .env file in the root directory:**
    ```Code snippet
    GEMINI_API_KEY=your_gemini_key_here
    GEOAPIFY_API_KEY=your_geoapify_key_here

3. **Install dependencies: (Note: Ensure you have flask, google-generativeai, requests, python-dotenv, and fpdf installed.)**
    ```bash
    pip install flask google-generativeai requests python-dotenv fpdf

4. **Launch the application:**
    ```bash
    python app.py

Developed as a college project exploring the intersection of Generative AI and Geolocation services.
