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

// ===== Helpers (internal only) =====
function stripDefaultTrailer(text: string): string {
  // Remove the standard "#RunKeeper ... http(s)://..." tail so only user text remains.
  return text.replace(DEFAULT_TRAILER_RX, '').trim();
}

function classifySource(text: string): SourceKey {
  const match = SOURCE_RULES.find(([_, rx]) => rx.test(text));
  return (match?.[0] ?? 'miscellaneous');
}

class Tweet {
	private text:string;
	time:Date;

	constructor(tweet_text:string, tweet_time:string) {
        this.text = tweet_text ?? '';
		this.time = new Date(tweet_time);//, "ddd MMM D HH:mm:ss Z YYYY"
	}

	private get activityUrl(): string | null {
    const m = this.text.match(/https?:\/\/\S+/i);
    return m ? m[0] : null;
  	}

	/** Lowercased copy for quick matches */
	private get lc(): string {
	return this.text.toLowerCase();
	}
	
	//returns either 'live_event', 'achievement', 'completed_event', or 'miscellaneous'
    get source():string {
        //TODO: identify whether the source is a live event, an achievement, a completed event, or miscellaneous.
        return classifySource(this.text);
    }

    //returns a boolean, whether the text includes any content written by the person tweeting.
    get written():boolean {
        //TODO: identify whether the tweet is written
    	const cleaned = this.writtenText;
    	return cleaned.length > 0;
    }

    get writtenText():string {
        if(!this.written) {
            return "";
        }
        //TODO: parse the written text from the tweet
		// 1) remove the tail "#RunKeeper … http…"
	    let cleaned = stripDefaultTrailer(this.text);
	
	    // 2) remove common boilerplate fragments that aren't truly user-written
	    const AUTO_PHRASES: RegExp[] = [
			/\bwith\s+runkeeper\b\.?/i,
    		/\bvia\s+@?runkeeper\b\.?/i
	    ];
	    AUTO_PHRASES.forEach(rx => (cleaned = cleaned.replace(rx, ' ')));
	
	    // 3) collapse whitespace / trim punctuation noise
	    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^[\s\-\–\—\:;,\.]+|[\s\-\–\—\:;,\.]+$/g, '');
	
        return cleaned.trim();
    }

    get activityType():string {
        if (this.source != 'completed_event') {
            return "unknown";
        }
        //TODO: parse the activity type from the text of the tweet
        // Look for activity keywords (include aliases)
	    const ACTIVITY_MAP: Array<[string, RegExp]> = [
	      ['run', /\brun(?:ning)?\b/i],
	      ['walk', /\bwalk(?:ing)?\b/i],
	      ['cycle', /\b(?:cycle|cycling|bike|biking|ride|riding)\b/i],
	      ['hike', /\bhik(?:e|ing)\b/i],
	      ['swim', /\bswim(?:ming)?\b/i],
	      ['row', /\brow(?:ing)?\b/i],
	      ['ski', /\bski(?:ing)?\b/i],
	      ['yoga', /\byoga\b/i],
	      // add more if your data uses others (elliptical, treadmill, etc.)
	    ];
	    const hit = ACTIVITY_MAP.find(([_, rx]) => rx.test(this.text));
	    return hit ? hit[0] : 'unknown';
    }

    get distance():number {
        if(this.source != 'completed_event') {
            return 0;
        }
        //TODO: prase the distance from the text of the tweet
        // Patterns: “5.00 mi”, “10 km”
	    const m = this.text.match(/(\d+(?:\.\d+)?)\s*(mi|km)\b/i);
	    if (!m) return 0;
	
	    const value = parseFloat(m[1]);
	    const unit = m[2].toLowerCase();
	
	    if (isNaN(value)) return 0;
	    // Convert km → miles so the UI can display a single unit
	    return unit === 'km' ? value * 0.621371 : value; // miles
    }

    getHTMLTableRow(rowNumber:number):string {
        //TODO: return a table row which summarizes the tweet with a clickable link to the RunKeeper activity
        const dateStr = this.time.toLocaleString('en-US', {
	      year: 'numeric', month: 'short', day: 'numeric',
	      hour: '2-digit', minute: '2-digit'
	    });
	
	    const src = this.source;
	    const act = this.activityType;
	    const dist = this.distance > 0 ? `${this.distance.toFixed(2)} mi` : '';
	    const url = this.activityUrl;
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
