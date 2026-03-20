.

🧠 Project Title

AI-Based Document Intelligence Web Application using Azure

📌 Project Overview

Developed a full-stack web application that performs optical character recognition (OCR) on images using Microsoft Azure Document Intelligence. The system allows users to upload an image or provide an image URL and extracts readable text in real-time.

🎯 Objective

To build an intelligent system that automates text extraction from documents, reducing manual effort and enabling further processing like data analysis or automation workflows.

🏗️ System Architecture

Frontend (Client-side):

HTML, CSS, JavaScript

Responsive UI with animated components

User inputs: Azure endpoint, API key, image upload or URL

Backend (Server-side):

Python with Flask

REST API endpoint (/analyze)

Handles user input, communicates with Azure API

Cloud Integration:

Azure Document Intelligence (prebuilt-read model)

Extracts text from images using OCR

⚙️ Key Features
✅ 1. Dual Input Support

Upload local image files

Or analyze images via URL

✅ 2. Real-time Text Extraction

Uses Azure OCR model

Displays extracted text instantly

✅ 3. Secure API Handling

API calls handled via backend (Flask)

Prevents direct exposure of Azure keys in frontend

✅ 4. Interactive UI

Clean layout with separate sections:

Configuration panel

Input panel

Output panel

Animated button and responsive design

✅ 5. Error Handling

Handles missing inputs

Displays API or server errors clearly

🧰 Technologies Used
Category	Technology
Frontend	HTML, CSS, JavaScript
Backend	Python, Flask
Cloud AI	Azure Document Intelligence
Libraries	flask-cors, azure-ai-documentintelligence
Protocol	REST API
🔄 Workflow

User enters Azure endpoint + API key

User uploads image or provides URL

Frontend sends request to Flask backend

Backend calls Azure Document Intelligence API

Azure processes image using OCR model

Extracted text is returned and displayed

📊 Output

Extracted text displayed line-by-line

Supports multiple pages and structured text

🚧 Challenges Faced

Handling CORS issues between frontend and backend

Managing Azure SDK changes (body vs analyze_request)

Ensuring correct Flask project structure (templates/static)

Debugging environment issues (pip, modules, interpreter)

💡 Learning Outcomes

Hands-on experience with cloud AI services (Azure)

Understanding of full-stack development workflow

Learned API integration and asynchronous processing

Improved debugging skills in Python and web apps

Exposure to real-world AI application development

🚀 Future Enhancements

Add table extraction (prebuilt-layout)

Export results to PDF / Excel

Add user authentication & history tracking

Deploy application on cloud (Azure / Render)

Integrate AI for auto summarization or MCQ solving
