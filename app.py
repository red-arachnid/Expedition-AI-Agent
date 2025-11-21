import logging, os, google.generativeai as genai
from dotenv import load_dotenv
from flask import (Flask, render_template, request, send_file, jsonify)
from pdf_converter import CreatePDF

load_dotenv()
app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash')
except Exception as e:
    logger.log(f"Failed to configure GEMINI: {e}")

# --- ROUTES ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_itinerary():
    try:
        data = request.json
        logger.info(f"Received request for: {data['location']}")

        # 1. Construct Prompt
        prompt = (
            f"Act as an expert travel agent. Plan a trip to {data['location']} "
            f"from {data['startDate']} to {data['endDate']}. "
            f"Vibe: {data['occasion']}. Budget: ${data['budget']}. "
            f"\nProvide: 3 specific hotels (40% of budget), 5 top POIs, and a day-by-day itinerary. "
            f"Keep it professional and concise. No markdown formatting."
        )

        # 2. Call Gemini
        response = model.generate_content(prompt)
        ai_text = response.text

        # 3. Generate PDF
        pdf_path = CreatePDF(data, ai_text)

        # 4. Return the PDF path (in a real app, you'd upload to cloud storage)
        # For now, we send the text to preview and the download link
        return jsonify({
            "success": True,
            "preview": ai_text,
            "pdf_url": f"/download?file={os.path.basename(pdf_path)}"
        })

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/download')
def download_file():
    filename = request.args.get('file')
    # In production, secure this path!
    path = os.path.join("/tmp" if os.name != 'nt' else os.getcwd(), filename)
    return send_file(path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
