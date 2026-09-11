CREATE INDEX `attachments_record_created_idx` ON `attachments` (`recordId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `record_revisions_record_created_idx` ON `recordRevisions` (`recordId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `records_kind_status_published_idx` ON `records` (`recordKind`,`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `records_owner_idx` ON `records` (`ownerOpenId`);--> statement-breakpoint
CREATE INDEX `records_fork_idx` ON `records` (`forkOfRecordId`);