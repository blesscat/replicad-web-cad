# code-formatting Specification

## Purpose
TBD - created by archiving change configure-code-formatting. Update Purpose after archive.
## Requirements
### Requirement: Consistent formatter configuration

The project MUST provide one shared Prettier configuration for supported source, test, and project configuration files. JavaScript-family files, including JavaScript, JSX, MJS, TypeScript, and TSX, MUST be formatted without semicolons, and the configuration MUST support Astro frontmatter and templates. The formatter MUST preserve the project's double-quote style unless a future formatting change explicitly changes that convention.

#### Scenario: JavaScript-family files use no semicolons

- **WHEN** the formatter is run on a JavaScript, MJS, TypeScript, JSX, or TSX file
- **THEN** the formatted output MUST omit statement-terminating semicolons
- **AND** string literals and imports MUST use the configured double-quote style

#### Scenario: Astro files are formatted by the same workflow

- **WHEN** the formatter is run on an Astro page or component containing frontmatter and markup
- **THEN** both the frontmatter and Astro markup MUST be processed successfully
- **AND** the frontmatter MUST follow the no-semicolon JavaScript-family rule

### Requirement: Repeatable formatting commands

The project MUST expose a `pnpm format` command that writes the shared formatting rules to all files in scope, and a `pnpm format:check` command that checks the same file set without modifying files. `format:check` MUST return a non-zero exit status when any in-scope file is not formatted.

#### Scenario: Developer formats the project

- **WHEN** a developer runs `pnpm format`
- **THEN** all in-scope source, test, style, and root configuration files MUST be formatted using the shared Prettier configuration
- **AND** generated output, dependency directories, test reports, coverage output, WASM assets, and every file under `openspec/` MUST remain outside the formatting operation

#### Scenario: Check detects an unformatted file

- **WHEN** an in-scope file does not match the shared formatter output
- **AND** a developer or CI process runs `pnpm format:check`
- **THEN** the command MUST report the file as unformatted
- **AND** the command MUST exit unsuccessfully

#### Scenario: Check accepts formatted files

- **WHEN** every in-scope file matches the shared formatter output
- **AND** a developer or CI process runs `pnpm format:check`
- **THEN** the command MUST complete successfully without changing files

### Requirement: Automatic editor formatting

The project MUST provide a VS Code workspace setting that selects the Prettier extension for supported JavaScript, TypeScript, TSX, Astro, style, data, and Markdown files and enables formatting on save. The editor setting MUST use the same repository formatter configuration as the command-line commands.

#### Scenario: Supported file is saved in VS Code

- **WHEN** a developer saves an in-scope JavaScript-family or Astro file in VS Code
- **THEN** the file MUST be formatted automatically with the repository Prettier configuration
- **AND** newly formatted JavaScript-family code MUST not contain statement-terminating semicolons

### Requirement: Formatting rollout preserves application behavior

Applying the formatter to the existing in-scope files MUST be a source-only change. It MUST NOT change the CAD workspace behavior, Worker message contract, CAD kernel ownership, routes, accessibility semantics, or test intent.

#### Scenario: Existing quality gates pass after formatting

- **WHEN** the formatter has been applied to the in-scope files
- **THEN** `pnpm format:check`, `pnpm check`, `pnpm test`, and `pnpm build` MUST complete successfully
- **AND** the existing behavior-focused tests MUST continue to validate the same public behavior
