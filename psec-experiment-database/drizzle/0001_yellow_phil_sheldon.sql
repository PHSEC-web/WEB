CREATE TABLE `experiments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`discipline` varchar(80) NOT NULL,
	`title` varchar(240) NOT NULL,
	`category` varchar(80) NOT NULL,
	`theoreticalBasis` text NOT NULL,
	`historicalBackground` text NOT NULL,
	`hypothesis` text,
	`procedure` text,
	`author` varchar(160),
	`status` varchar(40) NOT NULL DEFAULT 'archived',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experiments_id` PRIMARY KEY(`id`),
	CONSTRAINT `experiments_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberName` varchar(160) NOT NULL,
	`memberId` varchar(80) NOT NULL,
	`discipline` varchar(80) NOT NULL,
	`title` varchar(240) NOT NULL,
	`theoreticalBasis` text NOT NULL,
	`historicalBackground` text,
	`hypothesis` text NOT NULL,
	`procedure` text NOT NULL,
	`materials` text NOT NULL,
	`expectedOutput` varchar(120) NOT NULL,
	`attachmentName` varchar(240),
	`status` varchar(40) NOT NULL DEFAULT 'pending',
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(32) NOT NULL DEFAULT 'user';