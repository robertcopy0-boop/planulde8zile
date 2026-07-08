const nodemailer = require("nodemailer");

exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const params = event.queryStringParameters || {};

    const token = params.token;
    const to = params.to;
    const mode = params.mode || "both";

    if (!process.env.TEST_EMAIL_TOKEN) {
      throw new Error("Lipsește TEST_EMAIL_TOKEN din Netlify.");
    }

    if (token !== process.env.TEST_EMAIL_TOKEN) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Token invalid." })
      };
    }

    if (!to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Lipsește emailul de test. Adaugă ?to=emailul_tau" })
      };
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

    if (!process.env.MATERIAL_BUMP_URL) {
      throw new Error("Lipsește MATERIAL_BUMP_URL din Netlify.");
    }

    const planUrl = process.env.MATERIAL_PLAN_URL;
    const bumpUrl = process.env.MATERIAL_BUMP_URL;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const emailsSent = [];

    async function sendBaseEmail() {
      const subject = "[TEST FĂRĂ ORDER BUMP] Materialul tău: Planul recapitulativ de 8 zile";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <p>Bună, Robert!</p>

          <p>Acesta este un email de test pentru comanda <strong>fără order bump</strong>.</p>

          <p>Clientul ar trebui să primească doar materialul principal:</p>

          <p>
            <strong>Planul recapitulativ de 8 zile:</strong><br>
            <a href="${planUrl}" target="_blank">${planUrl}</a>
          </p>

          <p>Dacă vezi doar acest link, testul fără order bump este corect.</p>

          <p>Cu drag,<br>Robert</p>
        </div>
      `;

      const text = `Bună, Robert!

Acesta este un email de test pentru comanda fără order bump.

Clientul ar trebui să primească doar materialul principal:

Planul recapitulativ de 8 zile:
${planUrl}

Dacă vezi doar acest link, testul fără order bump este corect.

Cu drag,
Robert`;

      await transporter.sendMail({
        from: `"Robert Daria" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });

      emailsSent.push("fara_order_bump");
    }

    async function sendBumpEmail() {
      const subject = "[TEST CU ORDER BUMP] Materialele tale: Planul de 8 zile + materialul pentru Subiectul III";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <p>Bună, Robert!</p>

          <p>Acesta este un email de test pentru comanda <strong>cu order bump</strong>.</p>

          <p>Clientul ar trebui să primească ambele materiale:</p>

          <p>
            <strong>1. Planul recapitulativ de 8 zile:</strong><br>
            <a href="${planUrl}" target="_blank">${planUrl}</a>
          </p>

          <p>
            <strong>2. Material problema 1, Subiectul 3:</strong><br>
            <a href="${bumpUrl}" target="_blank">${bumpUrl}</a>
          </p>

          <p>Dacă vezi ambele linkuri, testul cu order bump este corect.</p>

          <p>Cu drag,<br>Robert</p>
        </div>
      `;

      const text = `Bună, Robert!

Acesta este un email de test pentru comanda cu order bump.

Clientul ar trebui să primească ambele materiale:

1. Planul recapitulativ de 8 zile:
${planUrl}

2. Material problema 1, Subiectul 3:
${bumpUrl}

Dacă vezi ambele linkuri, testul cu order bump este corect.

Cu drag,
Robert`;

      await transporter.sendMail({
        from: `"Robert Daria" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });

      emailsSent.push("cu_order_bump");
    }

    if (mode === "base") {
      await sendBaseEmail();
    } else if (mode === "bump") {
      await sendBumpEmail();
    } else {
      await sendBaseEmail();
      await sendBumpEmail();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        sentTo: to,
        emailsSent
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Eroare la testarea emailurilor."
      })
    };
  }
};