

const axios = require('axios');

exports.handler = async function(event, context) {
  const query = event.queryStringParameters;
  const code = query.code;

  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code',
    });

    const access_token = tokenResponse.data.access_token;

    // Step 2: Fetch recent activities
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const activities = activitiesResponse.data;

    // Step 3: Calculate total Wh and $WATT
    let totalWattHours = 0;
    activities.forEach(activity => {
      const avgWatts = activity.average_watts || 0;
      const durationSec = activity.elapsed_time || 0;
      totalWattHours += (avgWatts * durationSec) / 3600;
    });

    const totalWATT = (totalWattHours / 10).toFixed(2);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully calculated $WATT from Strava',
        watt_hours: totalWattHours.toFixed(2),
        watt_token: totalWATT,
        activities_fetched: activities.length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin only once
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
    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code',
    });

    const access_token = tokenResponse.data.access_token;
    const athlete_id = tokenResponse.data.athlete.id;

    // Step 2: Fetch recent activities
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const activities = activitiesResponse.data;

    // Step 3: Calculate total Wh and $WATT
    let totalWattHours = 0;
    activities.forEach(activity => {
      const avgWatts = activity.average_watts || 0;
      const durationSec = activity.elapsed_time || 0;
      totalWattHours += (avgWatts * durationSec) / 3600;
    });

    const totalWATT = (totalWattHours / 10).toFixed(2);

    // Step 4: Store in Firestore
    const userRef = db.collection('users').doc(String(athlete_id));
    await userRef.set({
      athlete_id,
      watt_hours: totalWattHours.toFixed(2),
      watt_token: totalWATT,
      updated_at: new Date().toISOString(),
      activities_count: activities.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully calculated and stored $WATT',
        athlete_id,
        watt_hours: totalWattHours.toFixed(2),
        watt_token: totalWATT,
        activities_fetched: activities.length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
