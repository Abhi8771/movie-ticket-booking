// Lightweight, deterministic intent parser.
// No AI, just robust regex/keywords.

const patterns = {
  LIST_MOVIES: /(now\s*playing|currently\s*showing|what\s*movies|movies\b)/i,
  MOVIE_INFO: /\b(info|details)\s+about\s+(.+)/i,
  SHOWTIMES: /\b(show\s*times?|showtime|when\s+is)\s+(.+)/i,
  SEATS_BY_SHOW: /\b(seats?|seat\s*availability).*(show)\s+([a-f\d]{24}|[A-Za-z0-9_-]+)/i, // show <id> (ObjectId or string)
  SEATS_BY_TITLE: /\b(seats?|seat\s*availability)\s+for\s+(.+)/i, // seats for <title>
  HELP: /\b(help|how|guide|book|booking)\b/i,
};

export function parseIntent(question) {
  const q = (question || '').trim();

  if (patterns.LIST_MOVIES.test(q)) return { type: 'LIST_MOVIES' };

  const info = q.match(patterns.MOVIE_INFO);
  if (info) return { type: 'MOVIE_INFO', title: info[2].trim() };

  const times = q.match(patterns.SHOWTIMES);
  if (times) return { type: 'SHOWTIMES', title: times[2].trim() };

  const seatsShow = q.match(patterns.SEATS_BY_SHOW);
  if (seatsShow) return { type: 'SEATS_BY_SHOW', showId: seatsShow[3] };

  const seatsTitle = q.match(patterns.SEATS_BY_TITLE);
  if (seatsTitle) return { type: 'SEATS_BY_TITLE', title: seatsTitle[2].trim() };

  if (patterns.HELP.test(q)) return { type: 'HELP' };

  return { type: 'UNKNOWN' };
}
