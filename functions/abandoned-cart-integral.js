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
    const data = JSON.parse(event.body || "{}");

    const {
      email,
      prenume,
      nume,
      telefon
    } = data;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email lipsă." })
      };
    }

    const PRET_BAZA_LEI = 521;
    const PRET_ORDER_BUMP_LEI = 59;

    const orderBumpActiv =
      data.orderBumpActiv === true ||
      data.orderBumpActiv === "true" ||
      data.orderBumpActiv === "da" ||
      data.orderBump === "da";

    const sumaFinalaLei = PRET_BAZA_LEI + (orderBumpActiv ? PRET_ORDER_BUMP_LEI : 0);

    const produsFinal = orderBumpActiv
      ? "Planul recapitulativ de 8 zile + Material problema 1, Subiectul 3"
      : "Planul recapitulativ de 8 zile";

    const variantaFinala = orderBumpActiv
      ? "Pagina 521 lei + Order Bump 59 lei"
      : "Pagina 521 lei";

    const orderBumpProdus = orderBumpActiv
      ? "Material problema 1, Subiectul 3"
      : "";

    const orderBumpPretLei = orderBumpActiv ? 59 : 0;

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_ABANDONED_GROUP_ID;

    if (!apiKey) {
      throw new Error("Lipsește MAILERLITE_API_KEY din Netlify Environment Variables.");
    }

    if (!groupId) {
      throw new Error("Lipsește MAILERLITE_ABANDONED_GROUP_ID din Netlify Environment Variables.");
    }

    const fields = {
      name: `${prenume || ""} ${nume || ""}`.trim(),
      phone: telefon || "",
      produs: produsFinal,
      varianta: variantaFinala,
      suma_lei: String(sumaFinalaLei),
      order_bump_activ: orderBumpActiv ? "da" : "nu",
      order_bump_produs: orderBumpProdus,
      order_bump_pret_lei: String(orderBumpPretLei)
    };

    let subscriberId = null;

    const subscriberResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        email,
        fields
      })
    });

    const subscriberData = await subscriberResponse.json();

    if (subscriberResponse.ok && subscriberData.data && subscriberData.data.id) {
      subscriberId = subscriberData.data.id;
    } else {
      const searchResponse = await fetch(
        `https://connect.mailerlite.com/api/subscribers?filter[email]=${encodeURIComponent(email)}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
        }
      );

      const searchData = await searchResponse.json();
      const existingSubscriber = searchData.data && searchData.data[0];

      if (!existingSubscriber) {
        throw new Error(subscriberData.message || "Nu am putut crea sau găsi subscriberul.");
      }

      subscriberId = existingSubscriber.id;

      await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          fields
        })
      });
    }

    const groupResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!groupResponse.ok) {
      const groupData = await groupResponse.json();
      throw new Error(groupData.message || "Nu am putut adăuga subscriberul în grup.");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        subscriberId,
        sumaLei: sumaFinalaLei,
        orderBumpActiv
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};