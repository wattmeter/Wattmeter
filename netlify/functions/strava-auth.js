const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://wattcoinstorage.firebaseio.com'
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  const code = event.queryStringParameters.code;
  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code'
    });

    const access_token = tokenResponse.data.access_token;
    const athlete_id = tokenResponse.data.athlete.id;

    // Fetch recent activities
    const activitiesResponse = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    // Calculate total watt-hours
    let totalWattHours = 0;
    activitiesResponse.data.forEach(activity => {
      const avgWatts = activity.average_watts || 0;
      const durationSec = activity.elapsed_time || 0;
      totalWattHours += (avgWatts * durationSec) / 3600;
    });

    // Convert to $WATT (10 Wh = 1 $WATT)
    const totalWATT = (totalWattHours / 10).toFixed(2);

    // Store in Firestore
    await db.collection('users').doc(String(athlete_id)).set({
      athlete_id,
      watt_hours: totalWattHours.toFixed(2),
      watt_token: totalWATT,
      activities_count: activitiesResponse.data.length,
      updated_at: new Date().toISOString()
    });

    // Redirect back to front-end with athlete_id
    return {
      statusCode: 302,
      headers: {
        Location: `https://melodious-queijadas-d749fe.netlify.app/?athlete_id=${athlete_id}`
      }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
