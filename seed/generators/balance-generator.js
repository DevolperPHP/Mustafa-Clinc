const moment = require('moment');

function generatePaymentHistory(totalAmount, progressType) {
  const payments = [];

  // Determine how many payments based on progress
  let paymentCount = 0;
  if (progressType === 'early') {
    paymentCount = Math.random() > 0.5 ? 1 : 0;
  } else if (progressType === 'mid') {
    paymentCount = Math.floor(Math.random() * 2) + 1;
  } else if (progressType === 'late' || progressType === 'completed') {
    paymentCount = Math.floor(Math.random() * 3) + 1;
  }

  // Generate payments
  for (let i = 0; i < paymentCount; i++) {
    // Calculate payment amount (roughly equal payments)
    const baseAmount = Math.floor(totalAmount / (paymentCount || 1));
    // Add some variation
    const variation = Math.floor(Math.random() * 20) - 10;
    const paymentAmount = baseAmount + variation;

    const daysAgo = (paymentCount - i - 1) * 30 + Math.floor(Math.random() * 15);

    const notes = i === 0 ? 'دفعة أولى' : (i === paymentCount - 1 ? 'دفعة أخيرة' : 'دفعة متوسطة');

    payments.push({
      amount: paymentAmount,
      Date: moment().subtract(daysAgo, 'days').locale('ar-kw').format('l'),
      Note: notes
    });
  }

  return payments;
}

module.exports = { generatePaymentHistory };
