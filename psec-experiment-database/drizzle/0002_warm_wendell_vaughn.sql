CREATE TABLE `submissionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`action` varchar(40) NOT NULL,
	`editor` varchar(160) NOT NULL,
	`note` text,
	`snapshotJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `submissions` MODIFY COLUMN `theoreticalBasis` text;--> statement-breakpoint
ALTER TABLE `submissions` MODIFY COLUMN `hypothesis` text;--> statement-breakpoint
ALTER TABLE `submissions` MODIFY COLUMN `procedure` text;--> statement-breakpoint
ALTER TABLE `submissions` MODIFY COLUMN `materials` text;--> statement-breakpoint
ALTER TABLE `submissions` MODIFY COLUMN `expectedOutput` varchar(120);--> statement-breakpoint
ALTER TABLE `submissions` ADD `attachmentKey` varchar(320);--> statement-breakpoint
ALTER TABLE `submissions` ADD `attachmentUrl` varchar(420);--> statement-breakpoint
ALTER TABLE `submissions` ADD `publishedDiscipline` varchar(80);--> statement-breakpoint
ALTER TABLE `submissions` ADD `publishedCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `submissions` ADD `rejectionComment` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `submissions` ADD `reviewedBy` varchar(160);