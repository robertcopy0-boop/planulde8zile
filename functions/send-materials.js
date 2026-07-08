const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

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
    const { paymentIntentId } = JSON.parse(event.body || "{}");

    if (!paymentIntentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Lipsește paymentIntentId." })
      };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Lipsește STRIPE_SECRET_KEY din Netlify.");
    }

    if (!process.env.EMAIL_USER) {
      throw new Error("Lipsește EMAIL_USER din Netlify.");
    }

    if (!process.env.EMAIL_APP_PASSWORD) {
      throw new Error("Lipsește EMAIL_APP_PASSWORD din Netlify.");
    }

    if (!process.env.MATERIAL_PLAN_URL) {
      throw new Error("Lipsește MATERIAL_PLAN_URL din Netlify.");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Plata nu este confirmată." })
      };
    }

    const metadata = paymentIntent.metadata || {};

    if (metadata.materiale_trimise === "da") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          alreadySent: true,
          message: "Materialele au fost deja trimise pentru această plată."
        })
      };
    }

    const email = metadata.email || paymentIntent.receipt_email;
    const prenume = metadata.prenume || "";
    const sumaLei = metadata.suma_lei || "";
    const produs = metadata.produs || "Planul recapitulativ de 8 zile";
    const orderBumpActiv = metadata.order_bump_activ === "da";

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Nu am găsit emailul clientului în Stripe." })
      };
    }

    const planUrl = process.env.MATERIAL_PLAN_URL;
    const bumpUrl = process.env.MATERIAL_BUMP_URL;

    if (orderBumpActiv && !bumpUrl) {
      throw new Error("Order bump activ, dar lipsește MATERIAL_BUMP_URL din Netlify.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const greeting = prenume ? `Bună, ${prenume}!` : "Bună!";

    const subject = orderBumpActiv
      ? "Materialele tale: Planul de 8 zile + materialul pentru Subiectul III"
      : "Materialul tău: Planul recapitulativ de 8 zile";

    const html = orderBumpActiv
      ? `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <p>${greeting}</p>

          <p>Îți mulțumesc pentru comandă.</p>

          <p>Ai mai jos materialele incluse în pachetul complet:</p>

          <p>
            <strong>1. Planul recapitulativ de 8 zile:</strong><br>
            <a href="${planUrl}" target="_blank">${planUrl}</a>
          </p>

          <p>
            <strong>2. Material problema 1, Subiectul 3:</strong><br>
            <a href="${bumpUrl}" target="_blank">${bumpUrl}</a>
          </p>

          <p>Îți recomand să le descarci și să le păstrezi.</p>

          <p>Cu drag,<br>Robert</p>
        </div>
      `
      : `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <p>${greeting}</p>

          <p>Îți mulțumesc pentru comandă.</p>

          <p>Poți accesa materialul aici:</p>

          <p>
            <strong>Planul recapitulativ de 8 zile:</strong><br>
            <a href="${planUrl}" target="_blank">${planUrl}</a>
          </p>

          <p>Îți recomand să îl descarci și să îl păstrezi.</p>

          <p>Cu drag,<br>Robert</p>
        </div>
      `;

    const text = orderBumpActiv
      ? `${greeting}

Îți mulțumesc pentru comandă.

Ai mai jos materialele incluse în pachetul complet:

1. Planul recapitulativ de 8 zile:
${planUrl}

2. Material problema 1, Subiectul 3:
${bumpUrl}

Îți recomand să le descarci și să le păstrezi.

Cu drag,
Robert`
      : `${greeting}

Îți mulțumesc pentru comandă.

Poți accesa materialul aici:
${planUrl}

Îți recomand să îl descarci și să îl păstrezi.

Cu drag,
Robert`;

    await transporter.sendMail({
      from: `"Robert Daria" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text,
      html
    });

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...metadata,
        materiale_trimise: "da",
        materiale_trimise_at: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        emailSentTo: email,
        orderBumpActiv,
        produs,
        sumaLei
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Eroare la trimiterea materialelor."
      })
    };
  }
};