const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin once\if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://wattcoinstorage.firebaseio.com'
  });
}

const db = admin.firestore();

exports.handler = async function(event) {
  const code = event.queryStringParameters.code;
  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    // Exchange code for token
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code'
    });

    const access_token = tokenRes.data.access_token;
    const athlete_id = tokenRes.data.athlete.id;

    // Fetch activities
    const activityRes = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    // Calculate watt-hours
    let totalWh = 0;
    activityRes.data.forEach(({ average_watts = 0, elapsed_time = 0 }) => {
      totalWh += (average_watts * elapsed_time) / 3600;
    });
    const tokens = (totalWh / 10).toFixed(2);

    // Store in Firestore
    await db.collection('users').doc(String(athlete_id)).set({
      athlete_id,
      watt_hours: totalWh.toFixed(2),
      watt_token: tokens,
      activities_count: activityRes.data.length,
      updated_at: new Date().toISOString()
    });

    // Redirect back with athlete_id
    return {
      statusCode: 302,
      headers: {
        Location: `https://melodious-queijadas-d749fe.netlify.app/?athlete_id=${athlete_id}`
      }
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
