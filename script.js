document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const endpoint = document.getElementById("endpoint").value;
  const key = document.getElementById("key").value;
  const imageUrl = document.getElementById("imageUrl").value;
  const fileInput = document.getElementById("fileInput").files[0];
  const output = document.getElementById("output");

  output.innerText = "Analyzing... ⏳";

  const formData = new FormData();
  formData.append("endpoint", endpoint);
  formData.append("key", key);

  if (imageUrl) {
    formData.append("imageUrl", imageUrl);
  } else if (fileInput) {
    formData.append("file", fileInput);
  } else {
    output.innerText = "Provide image or URL!";
    return;
  }

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.error) {
      output.innerText = "Error: " + data.error;
    } else {
      output.innerText = data.text.join("\n");
    }

  } catch (err) {
    output.innerText = "Server error: " + err.message;
  }
});