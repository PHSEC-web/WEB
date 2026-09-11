ALTER TABLE `attachments` MODIFY COLUMN `recordId` int;--> statement-breakpoint
ALTER TABLE `attachments` ADD `experimentId` int;--> statement-breakpoint
ALTER TABLE `attachments` ADD `submissionId` int;--> statement-breakpoint
CREATE INDEX `attachments_experiment_created_idx` ON `attachments` (`experimentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attachments_submission_created_idx` ON `attachments` (`submissionId`,`createdAt`);