// Native fetch in Node 18+
async function testGenerateImage() {
  const url = "http://localhost:3000/image/generate";
  const body = {
    prompt: "Unos jovenes trabajando en una oficina con una computadora",
    numberOfImages: 4,
    // brandId: "test-brand-123", // Optional now
    campaignId: "test-campaign-456",
    style: "minimalist",
    config: {
      aspectRatio: "9:16",
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
