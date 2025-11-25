import logging, os, json, glob, io
import google.generativeai as genai
import requests
from dotenv import load_dotenv
from flask import (Flask, render_template, request, send_file, jsonify, after_this_request)
from pdf_handler import CreatePDF, CleanCache

load_dotenv()
app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
except Exception as e:
    logger.log(f"Failed to configure GEMINI: {e}")

# --- ROUTES ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_itinerary():
    try:
        CleanCache(logger=logger)

        data = request.json
        logger.info(f"Received request for: {data['location']}")

        # 1. Construct Prompt
        prompt = (
            f"Act as an expert travel agent. Plan a trip to {data['location']} "
            f"from {data['startDate']} to {data['endDate']}. "
            f"Vibe: {data['occasion']}. Budget: ${data['budget']}. "
            f"\nReturn a valid JSON object with exactly these three keys:"
            f"\n- 'hotels': A list of 3 objects, each with 'name', 'price' (approx), and 'description'."
            f"\n- 'pois': A list of 5 objects, each with 'name' and 'description' (Must-visit places)."
            f"\n- 'itinerary': A single string containing a detailed day-by-day schedule formatted clearly with bullet points and newlines (do not use markdown bolding like **)."
        )

        # 2. Call Gemini
        response = model.generate_content(prompt)
        ai_data = json.loads(response.text)

        # 3. Generate PDF
        pdf_path = CreatePDF(data, ai_data.get('itinerary', 'No itinerary generated.'))

        # 4. Return the PDF path (in a real app, you'd upload to cloud storage)
        # For now, we send the text to preview and the download link
        return jsonify({
            "success": True,
            "hotels": ai_data.get('hotels', []),
            "pois": ai_data.get('pois', []),
            "pdf_url": f"/download?file={os.path.basename(pdf_path)}"
        })

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/download')
def download_file():
    filename = request.args.get('file')

    cache_dir = os.path.join(os.getcwd(), '_pdfcache')
    path = os.path.join(cache_dir, filename)

    if not os.path.exists(path):
        return "File not found or expired.", 404

    try:
        return_data = io.BytesIO()
        with open(path, 'rb') as fo:
            return_data.write(fo.read())

        return_data.seek(0)
        os.remove(path)
        logger.info(f"Deleted cached file successfully: {path}")

        return send_file(
            return_data,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except:
        logger.error(f"Error processing download: {e}")
        return "Error processing file", 500


@app.route('/get_location_name')
def get_location_name():
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')

        geoapify_api = os.getenv("GEOAPIFY_API_KEY")
        url = f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&apiKey={geoapify_api}"

        response = requests.get(url, timeout=10) #Timeout prevents hanging

        if response.status_code == 200:
            data = response.json()
            if data['features']:
                properties = data['features'][0]['properties']

                country = properties.get('country')
                city = properties.get('city') or properties.get('town') or properties.get('village')
                name = properties.get('name', '')

                is_ocean = False
                if not country:
                    is_ocean = True
                elif "Ocean" in name or "Sea" in name:
                    if not city:
                        is_ocean = True

                search_query = (
                    city or
                    properties.get('hamlet') or
                    properties.get('state') or
                    country
                )
                image_url = None

                if search_query and not is_ocean:
                    try:
                        # Using wiki to get a popular image of the given location
                        wiki_url = "https://en.wikipedia.org/w/api.php"
                        params = {
                            "action": "query",
                            "format": "json",
                            "titles": search_query,
                            "prop": "pageimages",
                            "pithumbsize": 400, # Width in pixels
                            "redirects": 1
                        }
                        headers = { "User-Agent": "ExpeditionAI/1.0 (contact@example.com)" }
                        wiki_response = requests.get(wiki_url, params=params,headers=headers ,timeout=10)

                        if wiki_response.status_code == 200 and 'application/json' in wiki_response.headers.get('Content-Type', ''):
                            pages = wiki_response.json().get('query', {}).get('pages', {})
                            for i in pages:
                                if 'thumbnail' in pages[i]:
                                    image_url = pages[i]['thumbnail']['source']
                                    break
                    except Exception as e:
                        logger.error(f"Wikipedia Image Fetch Error: {e}")

                result = {
                    "display_name": properties.get('formatted'),
                    "image": image_url,
                    "is_ocean": is_ocean,
                    "address": {
                        "city": properties.get('city', properties.get('county', '')),
                        "town": properties.get('town', ''),
                        "village": properties.get('village', ''),
                        "country": properties.get('country', '')
                    }
                }
                return jsonify(result)
        else:
            logger.error(f"Nominatim API Error: {response.text}")
            return jsonify({"error": "Location not found"}), 404
        
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
