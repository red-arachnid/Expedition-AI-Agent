from fpdf import FPDF
import datetime, os

def CreatePDF(data, ai_response):
    pdf = FPDF()
    pdf.add_page()
    
    def safe_text(text):
        return text.encode('latin-1', 'ignore').decode('latin-1')

    # Header
    pdf.set_font("Arial", "B", 20)
    pdf.cell(0, 15, safe_text(f"Expedition to {data['location']}"), ln=True, align='C')
    
    # Subheader
    pdf.set_font("Arial", "I", 12)
    subtitle = f"{data['startDate']} to {data['endDate']} | {data['occasion']} | ${data['budget']}"
    pdf.cell(0, 10, safe_text(subtitle), ln=True, align='C')
    pdf.ln(5)
    
    # Body
    pdf.set_font("Arial", size=11)
    # Clean markdown
    clean_text = ai_response.replace('**', '').replace('##', '').replace('* ', '- ')
    pdf.multi_cell(0, 8, safe_text(clean_text))
    
    # File handling
    filename = f"Itinerary_{data['location']}_Trip_Plan.pdf"
    filepath = os.path.join("/tmp" if os.name != 'nt' else os.getcwd(), filename)
    pdf.output(filepath)
    return filepath