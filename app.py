from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        endpoint = request.form.get("endpoint")
        key = request.form.get("key")

        if not endpoint or not key:
            return jsonify({"error": "Missing endpoint or key"}), 400

        client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )

        image_url = request.form.get("imageUrl")

        if image_url:
            poller = client.begin_analyze_document(
                model_id="prebuilt-read",
                body={"urlSource": image_url}
            )
        elif "file" in request.files:
            file = request.files["file"]
            poller = client.begin_analyze_document(
                model_id="prebuilt-read",
                body=file.read()
            )
        else:
            return jsonify({"error": "No input provided"}), 400

        result = poller.result()

        extracted_text = []
        for page in result.pages:
            for line in page.lines:
                extracted_text.append(line.content)

        return jsonify({"text": extracted_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)