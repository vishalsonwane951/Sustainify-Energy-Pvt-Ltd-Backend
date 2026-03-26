// src/config/mailer.js
const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true", // true = port 465, false = 587 STARTTLS
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return _transporter;
}

async function verifyMailer() {
  try {
    await getTransporter().verify();
    // console.log("✅ Mailer ready");
  } catch (err) {
    // console.error("❌ Mailer failed:", err.message);
    // console.error("   Check MAIL_HOST / MAIL_USER / MAIL_PASS in your .env");
  }
}

module.exports = { getTransporter, verifyMailer };