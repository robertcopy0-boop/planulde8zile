exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email lipsă." }) };
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_ABANDONED_GROUP_ID;

    if (!apiKey) {
      throw new Error("Lipsește MAILERLITE_API_KEY din Netlify Environment Variables.");
    }

    if (!groupId) {
      throw new Error("Lipsește MAILERLITE_ABANDONED_GROUP_ID din Netlify Environment Variables.");
    }

    const searchResponse = await fetch(`https://connect.mailerlite.com/api/subscribers?filter[email]=${encodeURIComponent(email)}`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const searchData = await searchResponse.json();
    const subscriber = searchData.data && searchData.data[0];

    if (subscriber) {
      await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriber.id}/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
