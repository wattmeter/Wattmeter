const axios = require('axios');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://wattcoinstorage.firebaseio.com'
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  const query = event.queryStringParameters;
  const code = query.code;

  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    // Step 1: Get access token
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code',
    });

    const access_token = tokenRes.data.access_token;
    const athlete_id = tokenRes.data.athlete.id;

    // Step 2: Get activities
    const activitiesRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const activities = activitiesRes.data;
    let totalWattHours = 0;

    activities.forEach(act => {
      const avgWatts = act.average_watts || 0;
      const duration = act.elapsed_time || 0;
      totalWattHours += (avgWatts * duration) / 3600;
    });

    const totalWATT = (totalWattHours / 1000).toFixed(2); // conversion rate

    // Step 3: Store in Firestore
    const ref = db.collection('users').doc(String(athlete_id));
    await ref.set({
      athlete_id,
      watt_hours: totalWattHours.toFixed(2),
      watt_token: totalWATT,
      updated_at: new Date().toISOString(),
      activities_count: activities.length
    });

    // Step 4: Redirect back to front-end
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
