ALTER TABLE `evidenceSubmissions` MODIFY COLUMN `experimentId` int;--> statement-breakpoint
ALTER TABLE `executionRecords` MODIFY COLUMN `experimentId` int;--> statement-breakpoint
ALTER TABLE `evidenceSubmissions` ADD `recordId` int;--> statement-breakpoint
ALTER TABLE `executionRecords` ADD `recordId` int;--> statement-breakpoint
CREATE INDEX `execution_records_record_created_idx` ON `executionRecords` (`recordId`,`createdAt`);--> statement-breakpoint
UPDATE `records` SET `category` = CASE
  WHEN `lifecycle` = 'completed' THEN 'Completed Experimental Projects'
  WHEN `lifecycle` IN ('design', 'in_progress') THEN 'Formal Experimental Designs'
  ELSE 'Idea Pool'
END WHERE `recordKind` = 'project' AND `category` = 'Club Projects';
