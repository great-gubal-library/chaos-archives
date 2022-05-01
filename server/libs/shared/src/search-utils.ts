const MIN_WORD_LENGTH = 3;

export function escapeStringRegexp(str: string): string {
	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return str
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}

export function toSearchKeywords(query: string): string[] {
	return query
	.split(/\s+/)
	.map((word) => word.replace(/[()<>~*"+-]/g, '').toLowerCase())
	.filter((word) => word.length >= MIN_WORD_LENGTH);
}
