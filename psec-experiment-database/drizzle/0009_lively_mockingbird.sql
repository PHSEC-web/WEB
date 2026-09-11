ALTER TABLE `attachments` ADD `executionRecordId` int;--> statement-breakpoint
CREATE INDEX `attachments_execution_record_created_idx` ON `attachments` (`executionRecordId`,`createdAt`);