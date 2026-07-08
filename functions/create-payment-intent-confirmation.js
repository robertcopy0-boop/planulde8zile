const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Metodă nepermisă." })
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Lipsește STRIPE_SECRET_KEY din Netlify Environment Variables.");
    }

    const data = JSON.parse(event.body || "{}");

    const requiredFields = [
      "prenume",
      "nume",
      "email",
      "telefon",
      "strada",
      "numar",
      "localitate",
      "judet",
      "tipClient",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Câmp lipsă: ${field}` })
        };
      }
    }

    if (data.tipClient === "persoana-juridica") {
      if (!data.cif) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Câmp lipsă: cif" }) };
      }

      if (!data.denumireCompanie) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Câmp lipsă: denumireCompanie" }) };
      }
    }

const PRET_BAZA_LEI = 521;
const PRET_ORDER_BUMP_LEI = 59;

const orderBumpActiv =
  data.orderBumpActiv === true ||
  data.orderBumpActiv === "true" ||
  data.orderBumpActiv === "da" ||
  data.orderBump === "da";

const sumaLei = PRET_BAZA_LEI + (orderBumpActiv ? PRET_ORDER_BUMP_LEI : 0);

const produs = orderBumpActiv
  ? "Planul recapitulativ de 8 zile + Material problema 1, Subiectul 3"
  : "Planul recapitulativ de 8 zile";

const varianta = orderBumpActiv
  ? "Pagina 521 lei + Order Bump 59 lei"
  : "Pagina 521 lei";

const amount = sumaLei * 100;

    const metadata = {
      produs,
      varianta,
      suma_lei: String(sumaLei),
      tip_client: String(data.tipClient || ""),
      cif: String(data.cif || ""),
      denumire_companie: String(data.denumireCompanie || ""),
      prenume: String(data.prenume || ""),
      nume: String(data.nume || ""),
      telefon: String(data.telefon || ""),
      email: String(data.email || ""),
      tara: String(data.tara || "RO"),
      strada: String(data.strada || ""),
      numar: String(data.numar || ""),
      apartament: String(data.apartament || ""),
      localitate: String(data.localitate || ""),
      judet: String(data.judet || ""),
      order_bump_activ: orderBumpActiv ? "da" : "nu",
      order_bump_produs: orderBumpActiv ? "Material problema 1, Subiectul 3" : "",
      order_bump_pret_lei: orderBumpActiv ? "59" : "0",
      note: String(data.note || "").slice(0, 450)
    };

    const customer = await stripe.customers.create({
      name: `${data.prenume || ""} ${data.nume || ""}`.trim(),
      email: data.email,
      phone: data.telefon,
      address: {
        country: data.tara || "RO",
        line1: `${data.strada || ""} ${data.numar || ""}`.trim(),
        line2: data.apartament || "",
        city: data.localitate || "",
        state: data.judet || ""
      },
      metadata
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "ron",
      customer: customer.id,
      payment_method_types: ["card"],
      receipt_email: data.email,
      description: `${produs} - ${sumaLei} lei`,
      metadata
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Eroare la inițierea plății."
      })
    };
  }
};
