CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=230874;

CREATE TABLE `attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recordId` int DEFAULT NULL,
  `revisionId` int DEFAULT NULL,
  `fileName` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storageKey` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sizeBytes` int DEFAULT NULL,
  `kind` enum('report','protocol','data','photo','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `visibility` enum('public','members') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'members',
  `uploadedByOpenId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploadedByName` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `experimentId` int DEFAULT NULL,
  `submissionId` int DEFAULT NULL,
  `evidenceSubmissionId` int DEFAULT NULL,
  `executionRecordId` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `attachments_record_created_idx` (`recordId`,`createdAt`),
  KEY `attachments_experiment_created_idx` (`experimentId`,`createdAt`),
  KEY `attachments_submission_created_idx` (`submissionId`,`createdAt`),
  KEY `attachments_evidence_submission_created_idx` (`evidenceSubmissionId`,`createdAt`),
  KEY `attachments_execution_record_created_idx` (`executionRecordId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `evidenceSubmissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submitterName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `experimentId` int NOT NULL,
  `observationNotes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rejectionComment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `executionRecords` (
  `id` int NOT NULL AUTO_INCREMENT,
  `experimentId` int NOT NULL,
  `evidenceSubmissionId` int DEFAULT NULL,
  `submitterName` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observationNotes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `execution_records_experiment_created_idx` (`experimentId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `experiments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discipline` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `theoreticalBasis` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `historicalBackground` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `hypothesis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `procedure` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'archived',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `experiments_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

CREATE TABLE `recordRevisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recordId` int NOT NULL,
  `revisionNo` int NOT NULL,
  `action` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changedFields` json NOT NULL,
  `snapshotJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `editorOpenId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `editorName` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `editorRole` enum('member','admin','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `note` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `record_revisions_record_revision_unique` (`recordId`,`revisionNo`),
  KEY `record_revisions_record_created_idx` (`recordId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

CREATE TABLE `records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recordKind` enum('reference','project') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'project',
  `discipline` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','needs_revision','published','rejected','hidden') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `lifecycle` enum('idea','design','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visibility` enum('public','members') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `title` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abstract` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theoreticalBasis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `historicalBackground` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hypothesis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `procedure` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materials` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expectedOutput` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `results` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `limitations` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nextQuestion` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ethicsReviewed` int NOT NULL DEFAULT '0',
  `ethicsNotes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorName` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorMemberId` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownerOpenId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `forkOfRecordId` int DEFAULT NULL,
  `reviewComment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requiredChanges` json DEFAULT NULL,
  `reviewedBy` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `revisionCount` int NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `records_slug_unique` (`slug`),
  KEY `records_discipline_category_status_idx` (`discipline`,`category`,`status`),
  KEY `records_kind_status_published_idx` (`recordKind`,`status`,`publishedAt`),
  KEY `records_owner_idx` (`ownerOpenId`),
  KEY `records_fork_idx` (`forkOfRecordId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

CREATE TABLE `submissionHistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submissionId` int NOT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `editor` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `snapshotJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=480001;

CREATE TABLE `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `memberName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `memberId` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discipline` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL,
  `theoreticalBasis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `historicalBackground` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hypothesis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `procedure` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materials` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expectedOutput` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachmentName` varchar(240) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `attachmentKey` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachmentUrl` varchar(420) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publishedDiscipline` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publishedCategory` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejectionComment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=360001;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loginMethod` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=4410001;
