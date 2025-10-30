type SourceKey = 'completed_event' | 'live_event' | 'achievement' | 'miscellaneous';

const DEFAULT_TRAILER_RX = /#RunKeeper.*https?:\/\/\S+$/i;

// Rules for classifying the tweet source.
const SOURCE_RULES: Array<[SourceKey, RegExp]> = [
  // "Just completed a 5.00 mi run" / "Finished a 10 km walk"
  ['completed_event', /\b(?:just|i|we)\s+(?:completed|finished)\b/i],
  // "I'm now running", "Currently walking"
  ['live_event', /\b(?:i'?m\s+)?(?:now|currently)\s+(?:running|walking|cycling|hiking|swimming|biking|riding)\b/i],
  // "New personal record", "Achieved a goal"
  ['achievement', /\b(?:achiev(?:ed|ement)|personal\s+record|new\s+record|\bPR\b|set\s+a\s+goal)\b/i],
  // Fallback
  ['miscellaneous', /.*/]
];

// helpers
function stripTrailer(s: string): string {
  // Remove the canonical “#RunKeeper … http(s)://…” trailer and any stray #RunKeeper tags
  return s.replace(DEFAULT_TRAILER_RX, '').replace(/#RunKeeper/gi, '').trim();
}

function classifySource(text: string): SourceKey {
  const t = stripTrailer(text);
  for (const [key, rx] of SOURCE_RULES) {
    if (rx.test(t)) return key;
  }
  return 'miscellaneous';
}

// Extract the first URL (RunKeeper tends to append one)
function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

// Try to parse an activity (run, walk, cycle, etc.)
function detectActivity(text: string): string {
  const t = stripTrailer(text).toLowerCase();
  if (/\brun(?:ning)?\b/.test(t)) return 'Run';
  if (/\bwalk(?:ing)?\b/.test(t)) return 'Walk';
  if (/\b(hike|hiking)\b/.test(t)) return 'Hike';
  if (/\b(bike|biking|ride|riding|cycling|cycle)\b/.test(t)) return 'Bike';
  if (/\bswim(?:ming)?\b/.test(t)) return 'Swim';
  if (/\brow(?:ing)?\b/.test(t)) return 'Row';
  return 'Other';
}

// Try to parse a distance like "5.00 mi" or "10 km"
function detectDistance(text: string): number | undefined {
  const t = stripTrailer(text);

  // Miles
  const mi = t.match(/(\d+(?:\.\d+)?)\s*mi\b/i);
  if (mi) return Number(mi[1]);

  // Kilometers -> miles (1 km ≈ 0.621371 mi)
  const km = t.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  if (km) return Number(km[1]) * 0.621371;

  return undefined;
}

// Format a date like “Monday, January 18, 2021”
function fmtLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

class Tweet {
  public readonly text: string;
  public readonly time: Date;

  constructor(text: string, time: string) {
    this.text = text ?? '';
    this.time = new Date(time);
  }

  // Lowercased copy for quick matches
  private get lc(): string {
    return this.text.toLowerCase();
  }

  //returns either 'live_event', 'achievement', 'completed_event', or 'miscellaneous'
  get source(): string {
    // identify whether the source is a live event, an achievement, a completed event, or miscellaneous.
    return classifySource(this.text);
  }

  //returns a boolean, whether the text includes any content written by the person tweeting.
  get written(): boolean {
    // For completed-event tweets, people often add a comment after " - ".
    // Example: "Just completed a 5.00 mi run - Felt great!"
    if (this.source !== 'completed_event') return false;
    const body = stripTrailer(this.text);
    const parts = body.split(/\s[-–—]\s/); // split on spaced dash
    return parts.length > 1 && parts[1].trim().length > 0;
  }

  //returns any written text. returns empty string if the tweet doesn't contain written text.
  get writtenText(): string {
    if (!this.written) return '';
    const body = stripTrailer(this.text);
    const parts = body.split(/\s[-–—]\s/);
    return parts.slice(1).join(' - ').trim();
  }

  // Activity type (Run/Walk/Bike/Swim/Other)
  get activityType(): string {
    return detectActivity(this.text);
  }

  // Distance in miles if present, otherwise undefined
  get distance(): number | undefined {
    return detectDistance(this.text);
  }

  // Builds a table row string for the Descriptions/Activities pages if needed later.
  writeTableRow(rowNumber: number): string {
    const dateStr = Number.isNaN(+this.time) ? '' : fmtLongDate(this.time);
    const src = this.source;
    const act = this.activityType;
    const dist = this.distance !== undefined ? this.distance.toFixed(2) : '';
    const url = firstUrl(this.text);
    const linkHtml = url ? `<a href="${url}" target="_blank" rel="noopener">link</a>` : '';

    return [
      '<tr>',
      `<td>${rowNumber}</td>`,
      `<td>${dateStr}</td>`,
      `<td>${src}</td>`,
      `<td>${act}</td>`,
      `<td>${dist}</td>`,
      `<td>${linkHtml}</td>`,
      '</tr>'
    ].join('');
  }
}

// Expose globally for non-module scripts
(window as any).Tweet = Tweet;
