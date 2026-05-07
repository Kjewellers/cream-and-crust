import Razorpay from 'razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscriptionId } = req.body;

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const response = await razorpay.subscriptions.cancel(subscriptionId);
    res.status(200).json(response);
  } catch (error) {
    console.error('Razorpay cancel error:', error);
    res.status(500).json({ error: error.message });
  }
}
