ALTER TABLE `attachments` ADD `evidenceSubmissionId` int;--> statement-breakpoint
CREATE INDEX `attachments_evidence_submission_created_idx` ON `attachments` (`evidenceSubmissionId`,`createdAt`);