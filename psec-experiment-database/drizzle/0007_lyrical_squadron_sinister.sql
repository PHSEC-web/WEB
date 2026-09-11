CREATE TABLE `evidenceSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` varchar(80) NOT NULL,
	`experimentId` int NOT NULL,
	`observationNotes` text,
	`status` varchar(40) NOT NULL DEFAULT 'pending',
	`rejectionComment` text,
	`reviewedAt` timestamp,
	`reviewedBy` varchar(160),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidenceSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `executionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`experimentId` int NOT NULL,
	`evidenceSubmissionId` int,
	`memberId` varchar(80),
	`observationNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `executionRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `execution_records_experiment_created_idx` ON `executionRecords` (`experimentId`,`createdAt`);