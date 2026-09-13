CREATE TABLE `recordConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` int,
	`evidenceSubmissionId` int,
	`userOpenId` varchar(64) NOT NULL,
	`privacyVersion` varchar(40) NOT NULL,
	`termsVersion` varchar(40) NOT NULL,
	`researchSafetyVersion` varchar(40) NOT NULL,
	`contentRightsVersion` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recordConsents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `evidenceSubmissions` ADD `ownerOpenId` varchar(64);
--> statement-breakpoint
CREATE INDEX `record_consents_record_idx` ON `recordConsents` (`recordId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `record_consents_evidence_idx` ON `recordConsents` (`evidenceSubmissionId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `record_consents_user_idx` ON `recordConsents` (`userOpenId`,`createdAt`);
