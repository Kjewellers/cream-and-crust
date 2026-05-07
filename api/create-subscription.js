import Razorpay from 'razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, planId } = req.body;

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId || process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: 12, // 1 year
      notes: {
        userId: userId
      }
    });

    res.status(200).json(subscription);
  } catch (error) {
    console.error('Razorpay subscription error:', error);
    res.status(500).json({ error: error.message });
  }
}
