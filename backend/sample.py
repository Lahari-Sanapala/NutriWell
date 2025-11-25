
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.genai import Client
from PIL import Image, UnidentifiedImageError
import base64
import io
import traceback
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv("API_KEY")     # For Groq
api_keyy = os.getenv("API_KEYY")   # For Gemini
groq_api_url = os.getenv("GROQ_API_URL")

app = Flask(__name__)
CORS(app)

# ✅ Initialize Gemini client globally
client = Client(api_key=api_keyy)

# ✅ Nutrition prompt (same as test.py)
input_prompt = """
You are a professional nutritionist. Analyze the meal in the image and respond with:

1. Identify the name of the overall meal or dish.
2. List individual food items present in the image.
3. Estimated total nutritional values for the full meal:
   - Calories (in cal)
   - Carbohydrates (grams)
   - Proteins (grams)
   - Fats (grams)
   - Key Vitamins (if visually identifiable)
4. Health impact insights:
   - Weight Management
   - Skin Health
   - Hair Health
   - Sleep Quality
   - General Wellness
5. Improvement Suggestions (if nutrition is imbalanced)
"""

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        print("🔹 [INFO] Received /analyze request")

        data = request.get_json()
        base64_image = data.get("base64Image")

        if not base64_image:
            print("❌ No image found in request.")
            return jsonify({"error": "No image provided"}), 400

        # ✅ Remove Base64 header if exists
        if base64_image.startswith("data:image"):
            base64_image = base64_image.split(",")[1]

        # ✅ Decode and validate image
        try:
            image_bytes = base64.b64decode(base64_image)
            Image.open(io.BytesIO(image_bytes))  # Validate
            print("✅ Image successfully decoded and validated")
        except UnidentifiedImageError:
            print("❌ Invalid image format")
            return jsonify({"error": "Invalid image format"}), 400
        except Exception as e:
            print("❌ Image decoding failed:", e)
            traceback.print_exc()
            return jsonify({"error": "Image decoding failed"}), 500

        # ✅ Send to Gemini API (EXACT as test.py)
        print("🚀 Sending image to Gemini model for summary generation...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{
                "role": "user",
                "parts": [
                    {"text": input_prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}}
                ]
            }]
        )

        # ✅ Extract summary
        try:
            summary_text = response.candidates[0].content.parts[0].text
        except Exception:
            summary_text = str(response)

        # ✅ Print summary to terminal for debugging
        print("\n🧠 ---- SUMMARY GENERATED ----")
        print(summary_text)
        print("-------------------------------\n")

        if summary_text:
            return jsonify({"summary": summary_text})
        else:
            print("❌ No summary returned from Gemini.")
            return jsonify({"error": "No summary returned from Gemini"}), 500

    except Exception as e:
        print("❌ [EXCEPTION] in /analyze:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/analyzeCalorie', methods=['POST'])
def analyzeCalorie():
    try:
        print("🔹 [INFO] Received /analyzeCalorie request")
        data = request.get_json()
        text = data.get('summary')

        prompt = (
            "You are a nutrition assistant.\n"
            "Given a food summary with nutrient ranges, calculate the average values for:\n"
            "- Calories\n"
            "- Carbohydrates (g)\n"
            "- Proteins (g)\n"
            "- Fats (g)\n"
            "Format the response exactly as:\n"
            "avg_calories, avg_carbohydrates, avg_proteins, avg_fats\n"
            "Only return the numbers as comma-separated only values, must not give ranges.\n\n"
            f"Summary:\n{text}"
        )

        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You are a helpful nutrition assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 100,
            "top_p": 1,
            "n": 1
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        response = requests.post(groq_api_url, headers=headers, json=payload)

        if response.status_code == 200:
            result = response.json()
            generated_text = result['choices'][0]['message']['content']
            print(f"✅ Calorie Analysis: {generated_text}")
            return jsonify({"CalorieResponse": generated_text})
        else:
            print("❌ Groq API error:", response.text)
            return jsonify({"Error": response.text}), response.status_code

    except Exception as e:
        print("❌ [EXCEPTION] in /analyzeCalorie:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("🚀 Flask server starting on http://0.0.0.0:8501 ...")
    app.run(host="0.0.0.0", port=8501, debug=True)

