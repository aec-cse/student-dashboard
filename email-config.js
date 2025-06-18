// Email Configuration
// Replace these values with your actual email service credentials

const EMAIL_CONFIG = {
  // EmailJS Configuration
  emailjs: {
    serviceId: 'service_s0u3vte', // Your EmailJS Service ID
    templateId: 'template_tia1dnq', // Your EmailJS Template ID
    userId: 'feh6p7dxh9wpdNTFF' // Your EmailJS Public Key
  },
  
  // Alternative: SendGrid Configuration
  sendgrid: {
    apiKey: 'YOUR_SENDGRID_API_KEY',
    fromEmail: 'noreply@yourcompany.com'
  },
  
  // Alternative: Formspree Configuration
  formspree: {
    endpoint: 'https://formspree.io/f/YOUR_FORM_ID'
  }
};

// Email Templates
const EMAIL_TEMPLATES = {
  enquiryResponse: {
    subject: 'Response to your enquiry',
    template: `
Dear {{userName}},

Thank you for contacting us. We have reviewed your enquiry and here is our response:

**Status:** {{status}}
**Response:** {{response}}

If you have any further questions, please don't hesitate to contact us.

Best regards,
The Admin Team

---
This is an automated response. Please do not reply to this email.
    `
  }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EMAIL_CONFIG, EMAIL_TEMPLATES };
} else {
  window.EMAIL_CONFIG = EMAIL_CONFIG;
  window.EMAIL_TEMPLATES = EMAIL_TEMPLATES;
}

