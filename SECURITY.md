# Security Policy

## Scope

This repository contains the source code for the PSEC Social Experiment Database. Do not
report passwords, access keys, private database exports, private attachments, or other
personal data in public issues.

## Reporting a vulnerability

If GitHub private vulnerability reporting is enabled for this repository, use the repository's
**Security** tab to create a private report. Otherwise, contact the project owner through a
private channel and include:

- a short description of the affected component;
- reproducible steps or a minimal proof of concept;
- the possible impact and whether data may have been exposed;
- any suggested mitigation.

Please do not open a public issue until the maintainer has had a reasonable opportunity to
investigate and release a fix. Remove secrets and personal data from all reports and logs.

## Credential exposure

If a credential is ever committed or exposed, rotate or revoke it immediately. Removing a file
from the latest commit does not remove it from Git history; history rewriting and force-pushing
should be treated as a separate incident-response decision.
