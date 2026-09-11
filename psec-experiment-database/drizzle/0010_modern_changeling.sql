ALTER TABLE `evidenceSubmissions` RENAME COLUMN `memberId` TO `submitterName`;--> statement-breakpoint
ALTER TABLE `executionRecords` RENAME COLUMN `memberId` TO `submitterName`;--> statement-breakpoint
ALTER TABLE `evidenceSubmissions` MODIFY COLUMN `submitterName` varchar(160) NOT NULL;--> statement-breakpoint
ALTER TABLE `executionRecords` MODIFY COLUMN `submitterName` varchar(160);