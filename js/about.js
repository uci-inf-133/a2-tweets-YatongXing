let tweet_array = [];

// --- small DOM helpers ---
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
function setTextByClass(cls, text) {
  document.querySelectorAll(`.${cls}`).forEach(el => { el.textContent = text; });
}
function fmtDate(d) {
  // Monday, January 18, 2021 style
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtPct(numerator, denominator) {
  if (!denominator) return '0.00%';
  return ( (numerator / denominator) * 100 ).toFixed(2) + '%';
}

function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}

	tweet_array = runkeeper_tweets.map(function(tweet) {
		return new Tweet(tweet.text, tweet.created_at);
	});

	// 1) Total count
  	setTextById('numberTweets', tweet_array.length);

	// 2) Earliest & latest dates
	const times = tweet_array.map(t => t.time).filter(d => d instanceof Date && !isNaN(+d));
	const earliest = new Date(Math.min(...times.map(d => +d)));
	const latest   = new Date(Math.max(...times.map(d => +d)));
	setTextById('firstDate', fmtDate(earliest));
	setTextById('lastDate',  fmtDate(latest));
	
	// 3) Category counts (single pass)
	const counts = { completed_event: 0, live_event: 0, achievement: 0, miscellaneous: 0 };
	for (const t of tweet_array) {
		const s = (s => (s in counts ? s : 'miscellaneous'))(t.source);
		counts[s] += 1;
	}

  	// 4) Write category counts & percentages with one loop
	const CATEGORY_CLASS = {
		completed_event: 'completedEvents',
		live_event: 'liveEvents',
		achievement: 'achievements',
		miscellaneous: 'miscellaneous'
	};
	Object.entries(CATEGORY_CLASS).forEach(([src, cls]) => {
		setTextByClass(cls, String(counts[src]));
		setTextByClass(cls + 'Pct', fmtPct(counts[src], N));
	});
	
	//This line modifies the DOM, searching for the tag with the numberTweets ID and updating the text.
	//It works correctly, your task is to update the text of the other tags in the HTML file!
	//document.getElementById('numberTweets').innerText = tweet_array.length;	
	// 5) User-written among completed events (tweet.ts decides what "written" means)
	const completedTweets = tweet_array.filter(t => t.source === 'completed_event');
	const completedWritten = completedTweets.filter(t => t.written === true);
	setTextByClass('written', String(completedWritten.length));
	setTextByClass('writtenPct', fmtPct(completedWritten.length, completedTweets.length));
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});
