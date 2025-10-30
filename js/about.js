let tweet_array = [];

// DOM helpers
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

function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}

	// Build Tweet objects
	tweet_array = runkeeper_tweets.map(t => new Tweet(t.text, t.created_at));
	
	// 1) Total count
	setTextById('numberTweets', String(tweet_array.length));
	
	// 2) Earliest & latest dates
	const times = tweet_array.map(t => t.time).filter(d => d instanceof Date && !isNaN(+d));
	const earliest = new Date(Math.min(...times.map(d => +d)));
	const latest   = new Date(Math.max(...times.map(d => +d)));
	setTextById('firstDate', fmtDate(earliest));
	setTextById('lastDate',  fmtDate(latest));
	
	// 3) Category counts
	const counts = { completed_event: 0, live_event: 0, achievement: 0, miscellaneous: 0 };
	for (const t of tweet_array) {
		const s = t.source;
		if (s in counts) counts[s] += 1;
			else counts.miscellaneous += 1;
	}
	
	// 4) Fill counts & percentages (two decimals)
	const N = tweet_array.length || 1;
	const pct = (n) => ( (n / N) * 100 ).toFixed(2) + '%';
	
	setTextByClass('completedEvents', String(counts.completed_event));
	setTextByClass('completedEventsPct', pct(counts.completed_event));
	
	setTextByClass('liveEvents', String(counts.live_event));
	setTextByClass('liveEventsPct', pct(counts.live_event));
	
	setTextByClass('achievements', String(counts.achievement));
	setTextByClass('achievementsPct', pct(counts.achievement));
	
	setTextByClass('miscellaneous', String(counts.miscellaneous));
	setTextByClass('miscellaneousPct', pct(counts.miscellaneous));
	
	// 5) User-written among completed events
	const completedTweets = tweet_array.filter(t => t.source === 'completed_event');
	const completedWritten = completedTweets.filter(t => t.written === true);
	const denom = completedTweets.length || 1;
	setTextByClass('written', String(completedWritten.length));
	setTextByClass('writtenPct', ((completedWritten.length / denom) * 100).toFixed(2) + '%');
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});
