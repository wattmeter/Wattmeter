const axios = require('axios');

exports.handler = async function(event) {
  const code = event.queryStringParameters.code;
  const client_id = '161922';
  const client_secret = 'a8123e04f2a9599b4c2600b4cf567e833448aced';

  try {
    // Step 1: Exchange code for Strava access token
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code'
    });
    const access_token = tokenRes.data.access_token;
    const athlete_id = tokenRes.data.athlete.id;

    // Step 2: Fetch last 5 activities for speed
    const activitiesRes = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities?per_page=5',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    // Step 3: Calculate total watt-hours
    let totalWh = 0;
    activitiesRes.data.forEach(activity => {
      const avgWatts = activity.average_watts || 0;
      const durationSec = activity.elapsed_time || 0;
      totalWh += (avgWatts * durationSec) / 3600;
    });
    const totalWATT = (totalWh / 10).toFixed(2);
    const count = activitiesRes.data.length;

    // Step 4: Redirect back with query params
    const redirectUrl =
      `https://melodious-queijadas-d749fe.netlify.app/` +
      `?athlete_id=${athlete_id}` +
      `&watt_token=${totalWATT}` +
      `&activities_count=${count}`;

    return {
      statusCode: 302,
      headers: { Location: redirectUrl },
      body: ''
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
