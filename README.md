**Documentation**

This project is a browser-based invoice analysis dashboard built for Azure AI Document Intelligence. It lets you enter your Azure `endpoint` and `API key`, upload multiple invoice files, and extract important fields like invoice number, vendor name, invoice date, tax amount, and total payable amount.

**Files**
- [index.html](C:/Users/perfect/OneDrive/Desktop/travelling%20blog/index.html): Main page structure
- [style.css](C:/Users/perfect/OneDrive/Desktop/travelling%20blog/style.css): UI styling, layout, and animations
- [script.js](C:/Users/perfect/OneDrive/Desktop/travelling%20blog/script.js): Azure API integration, file upload handling, polling, and result rendering

**How It Works**
1. Open `index.html` in a browser.
2. Enter your Azure Document Intelligence `endpoint` and `API key`.
3. Optionally adjust:
   - `API Version`
   - `Confidence Threshold`
4. Upload one or more invoice files in PDF or image format.
5. Click `Analyze Invoices`.
6. The app sends each file to Azure’s `prebuilt-invoice` model.
7. Results are shown in cards with extracted values and confidence percentages.

**Extracted Fields**
- Invoice Number
- Vendor Name
- Invoice Date
- Tax Amount
- Total Payable

**Validation Features**
- Shows confidence score for each extracted field
- Marks invoices as `Validated` or `Review Needed`
- Provides summary metrics:
  - Processed invoices
  - Average confidence
  - High-confidence documents
  - Documents needing review

**Storage**
- The endpoint, API key, API version, and confidence threshold are saved in browser `localStorage`.
- This means settings remain available on the same browser until cleared.

**Important Note**
This version calls Azure directly from the browser. That is simple for testing, but for production enterprise use, a backend proxy is recommended so the API key is not exposed in client-side code.

**Supported File Types**
- PDF
- PNG
- JPG / JPEG
- TIFF
- BMP

**Best Use Case**
This solution is good for testing invoice extraction accuracy across multiple invoice formats and evaluating whether Azure Document Intelligence is suitable for enterprise-level financial operations.

If you want, I can also turn this into a cleaner `README.md` file for your project folder.
