ALTER TABLE user
	ADD publicPlayerProfile TINYINT(4) NOT NULL DEFAULT 0,
	ADD playerName VARCHAR(255) NOT NULL DEFAULT '',
	ADD playerProfile MEDIUMTEXT NOT NULL DEFAULT '',
	ADD carrdProfile VARCHAR(255) NOT NULL DEFAULT '';