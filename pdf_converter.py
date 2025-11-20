from fpdf import FPDF

def CreatePDF(user_data, ai_response):
    pdf = FPDF()
    pdf.add_page()

    def safe_text(text):
        return text.encode('latin-1', 'ignore').decode('latin-1')

    # TITLE
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, f"Trip to {user_data.get('location')}", ln=True, align='C')

    # SUBTITLE
    pdf.set_font("Arial", "I", 12)
    pdf.cell(0, 10, f"{user_data.get('start_date')} - {user_data.get('end_date')} | Budget: ${user_data.get('budget')}", ln=True, align='C')
    pdf.ln(10)

    # REST OF THE CONTENT
    pdf.set_font("Arial", size=11)
    clean_text = safe_text(ai_response.replace('**', '').replace('#', ''))
    pdf.multi_cell(0, 10, clean_text) #Handles text wrapping

    filename = user_data.get('location').replace(' ', '_').encode('ascii', 'ignore').decode('ascii')
    filename = f"{filename}_Planned_Trip.pdf"
    pdf.output(filename)
    return filename