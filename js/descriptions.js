let tweet_array = [];
let written_tweets = [];

// helpers
function $(id) { return document.getElementById(id); }
function clearTable() {
  const tbody = $('tweetTable');
  if (tbody) tbody.innerHTML = '';
}
function setSearchUI(count, text) {
  if ($('searchCount')) $('searchCount').textContent = String(count);
  if ($('searchText'))  $('searchText').textContent  = text;
}
function linkify(text) {
  // turn any URL into a clickable link (new tab)
  return text.replace(/https?:\/\/\S+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}
function addRow(t, rowNumber) {
  const tbody = $('tweetTable');
  if (!tbody) return;

  // show activity type + full tweet with clickable links
  const html = [
    '<tr>',
    `<td>${rowNumber}</td>`,
    `<td>${t.activityType || ''}</td>`,
    `<td>${linkify(t.text)}</td>`,
    '</tr>'
  ].join('');
  tbody.insertAdjacentHTML('beforeend', html);
}

function parseTweets(runkeeper_tweets) {
  //Do not proceed if no tweets loaded
  if(runkeeper_tweets === undefined) {
    window.alert('No tweets returned');
    return;
  }

  // Build Tweet objects once
  tweet_array = runkeeper_tweets.map(t => new Tweet(t.text, t.created_at));

  // Filter to just the user-written tweets (ignore system-only auto texts)
  written_tweets = tweet_array.filter(t => t.written === true);
}

function addEventHandlerForSearch() {
  const input = $('textFilter');
  if (!input) return;

  // Search the written tweets as text is entered into the search box, and add them to the table
  const onChange = () => {
    const q = (input.value || '').trim();
    clearTable();

    if (q.length === 0) {
      setSearchUI(0, '');
      return;
    }

    const qLower = q.toLowerCase();

    // match if the query appears anywhere in the tweet text
    const matches = written_tweets.filter(t => t.text.toLowerCase().includes(qLower));

    setSearchUI(matches.length, q);

    // populate rows with number, activity type, and tweet (with links)
    matches.forEach((t, i) => addRow(t, i + 1));
  };

  // react to every keystroke
  input.addEventListener('input', onChange);

  // initialize UI
  setSearchUI(0, '');
  clearTable();
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
  addEventHandlerForSearch();
  loadSavedRunkeeperTweets().then(parseTweets);
});
