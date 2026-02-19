// Native fetch in Node 18+
async function testGenerateImage() {
  const url = "http://localhost:5153/image/generate";
  const body = {
    prompt:
      "A futuristic city with flying cars and neon lights, cyberpunk style",
    numberOfImages: 1,
    brandId: "test-brand-123",
    campaignId: "test-campaign-456",
    config: {
      aspectRatio: "16:9",
    },
  };

  try {
    console.log(`Sending request to ${url}...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Raw Response:", text);

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log("Parsed JSON:", JSON.stringify(data, null, 2));
      } catch (e) {
        console.log("Response is not JSON.");
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testGenerateImage();
