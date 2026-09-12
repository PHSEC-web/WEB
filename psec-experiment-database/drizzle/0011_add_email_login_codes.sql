CREATE TABLE `emailLoginCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`requestedIp` varchar(64),
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLoginCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_login_codes_email_created_idx` ON `emailLoginCodes` (`email`,`createdAt`);