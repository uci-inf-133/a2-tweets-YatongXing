let tweet_array = [];
let activity_vis_spec;
let distance_vis_spec;
let distance_vis_agg_spec;

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// helpers
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}
function isWeekend(dow) { return dow === 0 || dow === 6; }

function parseTweets(runkeeper_tweets) {
  //Do not proceed if no tweets loaded
  if(runkeeper_tweets === undefined) {
    window.alert('No tweets returned');
    return;
  }
  
  tweet_array = runkeeper_tweets.map(function(tweet) {
    return new Tweet(tweet.text, tweet.created_at);
  });

  // Consider only completed-event tweets for activity & distance
  const completed = tweet_array.filter(t => t.source === 'completed_event');

  // 1) Count tweets per activity
  const counts = new Map();
  const typesSet = new Set();
  for (const t of completed) {
    const type = t.activityType || 'Other';
    typesSet.add(type);
    counts.set(type, (counts.get(type) || 0) + 1);
  }

  // How many distinct activity types?
  setText('numberActivities', String(typesSet.size));

  // Top 3 activity types by count
  const sortedTypes = [...counts.entries()]
        .sort((a,b)=>b[1]-a[1])
        .map(([k])=>k);
  const top3 = sortedTypes.slice(0,3);

  setText('firstMost',  top3[0] || 'N/A');
  setText('secondMost', top3[1] || 'N/A');
  setText('thirdMost',  top3[2] || 'N/A');

  // Data for the count bar chart
  const countData = [...counts.entries()].map(([activityType,count]) => ({activityType, count}));

  activity_vis_spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "A graph of the number of Tweets containing each type of activity.",
    "data": { "values": countData },
    "mark": "bar",
    "encoding": {
      "x": {"field":"activityType", "type":"nominal", "title":"activity type", "sort":"-y"},
      "y": {"field":"count", "type":"quantitative", "title":"number of tweets"},
      "tooltip": [{"field":"activityType"},{"field":"count"}]
    }
  };
  vegaEmbed('#activityVis', activity_vis_spec, {actions:false});

  // 2) Distances by day for top-3 activities
  const distanceRows = completed
    .map(t => ({
      activityType: t.activityType || 'Other',
      distance: t.distance,
      dow: t.time.getDay(),
      day: DAY_LABELS[t.time.getDay()]
    }))
    .filter(r => r.distance !== undefined && top3.includes(r.activityType));

  // Raw scatter (many points)
  distance_vis_spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Distances by day of week for the three most tweeted activities.",
    "data": { "values": distanceRows },
    "mark": {"type":"point", "tooltip":true},
    "encoding": {
      "x": {"field":"day", "type":"nominal", "title":"time (day)", "sort": DAY_LABELS},
      "y": {"field":"distance", "type":"quantitative", "title":"distance"},
      "color": {"field":"activityType", "type":"nominal", "title":"activity"}
    }
  };

  // Aggregated means by day
  distance_vis_agg_spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Mean distances by day of week for the three most tweeted activities.",
    "data": { "values": distanceRows },
    "mark": {"type":"point", "filled": true},
    "encoding": {
      "x": {"field":"day", "type":"nominal", "title":"time (day)", "sort": DAY_LABELS},
      "y": {"aggregate":"mean", "field":"distance", "type":"quantitative", "title":"distance (mean)"},
      "color": {"field":"activityType", "type":"nominal", "title":"activity"}
    }
  };

  // Render raw by default; aggregated hidden until button press
  const visDiv = document.getElementById('distanceVis');
  const visAggDiv = document.getElementById('distanceVisAggregated');
  if (visAggDiv) visAggDiv.style.display = 'none';

  vegaEmbed('#distanceVis', distance_vis_spec, {actions:false});

  // Toggle button
  const btn = document.getElementById('aggregate');
  if (btn) {
    btn.addEventListener('click', () => {
      const showingAgg = visAggDiv && visAggDiv.style.display !== 'none';
      if (showingAgg) {
        // show raw
        visAggDiv.style.display = 'none';
        visDiv.style.display = '';
        btn.textContent = 'Show means';
        vegaEmbed('#distanceVis', distance_vis_spec, {actions:false});
      } else {
        // show aggregated
        visDiv.style.display = 'none';
        visAggDiv.style.display = '';
        btn.textContent = 'Show points';
        vegaEmbed('#distanceVisAggregated', distance_vis_agg_spec, {actions:false});
      }
    });
  }

  // 3) Fill narrative answers from the data
  const byTypeDistances = new Map();
  for (const r of distanceRows) {
    if (!byTypeDistances.has(r.activityType)) byTypeDistances.set(r.activityType, []);
    byTypeDistances.get(r.activityType).push(r.distance);
  }
  // Longest/shortest among the top-3 by mean distance
  const typeMeans = [...byTypeDistances.entries()].map(([k,arr]) => [k, mean(arr)]);
  typeMeans.sort((a,b)=>b[1]-a[1]);
  if (typeMeans.length) {
    setText('longestActivityType',  typeMeans[0][0]);
    setText('shortestActivityType', typeMeans[typeMeans.length-1][0]);
  }

  // Weekdays vs weekends (overall mean across top-3)
  const weekdayDistances = distanceRows.filter(r => !isWeekend(r.dow)).map(r => r.distance);
  const weekendDistances = distanceRows.filter(r =>  isWeekend(r.dow)).map(r => r.distance);
  setText('weekdayOrWeekendLonger',
    mean(weekendDistances) > mean(weekdayDistances) ? 'weekends' : 'weekdays'
  );
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
  loadSavedRunkeeperTweets().then(parseTweets);
});
