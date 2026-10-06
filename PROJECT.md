# MEAIPDFTool — PDF Processing Architecture

## Purpose
PDF-related application with a server project and client project.

## Components
- MEAIPDFTool.Server/ — server-side application.
- meaipdftool.client/ — client-side application.
- MEAIPDFTool.sln — solution.

## AI Workflow
Inspect server endpoints/services and client API integration before changes. Trace PDF input -> processing -> output/download.

## Rules
Preserve PDF fidelity, file handling, validation and security. Treat uploaded files as untrusted input. Avoid loading large documents entirely into memory unless required by the existing design.