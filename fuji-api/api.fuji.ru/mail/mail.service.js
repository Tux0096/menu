import nodemailer from 'nodemailer';

import { getStorage } from '../storage/storage.service.js';

const getTransporter = async () => {
  const { smtpHost, smtpUser, smtpPassword } = await getStorage();

  return nodemailer.createTransport({
    pool: true,
    host: smtpHost,
    port: 587,
    secure: false, // use TLS
    auth: {
      user: smtpUser, pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const sendMail = async (subject, message, to, cc = [], type = 'text') => {
  try {
    const { smtpUser } = await getStorage();
    const mailOptions = {
      from: `Fuji<${smtpUser}>`,
      to,
      cc,
      subject,
    };

    if (type === 'text') {
      mailOptions.text = message;
    }

    if (type === 'html') {
      mailOptions.html = message;
    }

    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (e) {
    console.log(e);
  }
};
