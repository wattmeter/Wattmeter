const axios = require('axios');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://wattcoinstorage.firebaseio.com',
  });
}

const db = admin.firestore();

exports.handler = async function (event) {
  const code = event.queryStringParameters.code;

  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code',
    });

    const access_token = tokenRes.data.access_token;
    const athlete_id = tokenRes.data.athlete.id;

    const activityRes = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const activities = activityRes.data;
    let totalWattHours = 0;

    activities.forEach(({ average_watts = 0, elapsed_time = 0 }) => {
      totalWattHours += (average_watts * elapsed_time) / 3600;
    });

    const wattToken = (totalWattHours / 10).toFixed(2);

    await db.collection('users').doc(String(athlete_id)).set({
      athlete_id,
      watt_hours: totalWattHours.toFixed(2),
      watt_token: wattToken,
      activities_count: activities.length,
      updated_at: new Date().toISOString(),
    });

    return {
      statusCode: 302,
      headers: {
        Location: `https://melodious-queijadas-d749fe.netlify.app/?athlete_id=${athlete_id}`,
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
