module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const SITE_URL = process.env.SITE_URL || "https://lgtfitness.com.au";
  const FROM_EMAIL = process.env.FROM_EMAIL || "LGT Fitness <guides@lgtfitness.com.au>";
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "coach.lgtfitness@gmail.com";

  const recipeUrl = `${SITE_URL}/guides/lgt-high-protein-recipe-pack.pdf`;
  const eatingUrl = `${SITE_URL}/guides/lgt-flexible-eating-guide.pdf`;

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#0a0a0a;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="padding:40px 32px 32px;text-align:center;">
        <div style="font-size:28px;font-weight:900;letter-spacing:2px;">
          <span style="color:#f5f5f0;">LGT</span><span style="color:#e8a838;margin:0 6px;">·</span><span style="color:#999;font-weight:300;">FITNESS</span>
        </div>
        <div style="width:60px;height:2px;background:#e8a838;margin:12px auto 0;border-radius:1px;"></div>
      </div>

      <!-- Body -->
      <div style="padding:0 32px 40px;">
        <h1 style="color:#f5f5f0;font-size:22px;margin:0 0 8px;font-weight:600;">Your free guides are ready.</h1>
        <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 28px;">
          Thanks for joining the LGT Fitness community. Here are your two free nutrition guides — download them, save them, and start putting them to work.
        </p>

        <!-- Guide 1 -->
        <a href="${recipeUrl}" style="display:block;text-decoration:none;background:#161616;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:12px;">
          <div style="font-size:11px;color:#e8a838;letter-spacing:2px;font-weight:600;margin-bottom:6px;">GUIDE 01</div>
          <div style="color:#f5f5f0;font-size:16px;font-weight:600;">High Protein Recipe Pack</div>
          <div style="color:#666;font-size:13px;margin-top:4px;">112 pages · 40+ recipes · Macros included</div>
        </a>

        <!-- Guide 2 -->
        <a href="${eatingUrl}" style="display:block;text-decoration:none;background:#161616;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:28px;">
          <div style="font-size:11px;color:#e8a838;letter-spacing:2px;font-weight:600;margin-bottom:6px;">GUIDE 02</div>
          <div style="color:#f5f5f0;font-size:16px;font-weight:600;">Flexible Eating Guide</div>
          <div style="color:#666;font-size:13px;margin-top:4px;">30 pages · Macros, micros &amp; meal planning</div>
        </a>

        <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
          When you're ready to take the next step, I offer personalised nutritional coaching and transformation packages.
          <a href="${SITE_URL}/#coaching" style="color:#e8a838;text-decoration:none;font-weight:500;">See coaching plans →</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="color:#999;font-size:12px;margin:0;">LGT Fitness · Brisbane, Australia</p>
      <p style="color:#666;font-size:11px;margin:8px 0 0;">You're receiving this because you requested the free nutrition guides from lgtfitness.com.au</p>
    </div>
  </div>
</body>
</html>`;

  try {
    // Send guides to the subscriber
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Your free LGT Fitness nutrition guides",
        html: htmlEmail,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error("Resend error:", err);
      return res.status(502).json({ error: "Failed to send email" });
    }

    // Notify Blake of new lead
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [NOTIFY_EMAIL],
          subject: `New guide download: ${email}`,
          html: `<p>Someone downloaded the free nutrition guides.</p><p><strong>Email:</strong> ${email}</p><p><strong>Time:</strong> ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}</p>`,
        }),
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Send failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
