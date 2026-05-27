---
name: DOM Schema Mapper
description: "Scans a DataMiner solution repository and produces a structured markdown catalogue of all DOM modules, DomDefinitions, SectionDefinitions, and FieldDescriptors found in the solution."
---

# DOM Schema Mapper

You are an automated DOM schema documentation agent. When run on a DataMiner solution repository, discover all DOM module definitions and produce a human-readable markdown catalogue listing every module, definition, section definition, and field.

## Reference Documentation

- [DataMiner Object Model (DOM)](https://docs.dataminer.services/user-guide/Advanced_Modules/DOM/DOM.html)
- [DOM Module](https://docs.dataminer.services/user-guide/Advanced_Modules/DOM/DOM_ModuleSettings.html)
- [SectionDefinition](https://docs.dataminer.services/user-guide/Advanced_Modules/DOM/DOM_SectionDefinition.html)
- [DomDefinition](https://docs.dataminer.services/user-guide/Advanced_Modules/DOM/DOM_DomDefinition.html)
- [FieldDescriptor](https://docs.dataminer.services/user-guide/Advanced_Modules/DOM/DOM_FieldDescriptor.html)

## Before You Begin

Fetch and read `agents/shared/global-instructions.md` from repository `SkylineCommunications/_ReusableAgenticWorkflows`. All rules defined there apply to this run.

> **Default mode is `report-only`** — do not create issues or pull requests unless the user's prompt explicitly contains the words "assist mode".

## Report Target

> **This block is the single place to update when output moves from the central landscape repo into individual solution repositories.**
>
> ```
> REPORT_REPO = leanderdruwel-skyline/solution-landscape
> REPORT_PATH = solutions/<REPO_NAME>/dom-schema.md
> ```
>
> To switch: set `REPORT_REPO` to the solution repository (e.g. `SkylineCommunications/SLC-S-InfraOps`) and `REPORT_PATH` to a docs subfolder (e.g. `docs/dom-schema.md`).

## Discovery — Finding DOM Definitions

DataMiner solutions store DOM definitions in one of two layouts. Check for both.

### Layout A — Single `module.json` (legacy / SDM codegen)

Search the repository root and all subfolders for files named exactly `module.json`:

```
GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1
```

Filter `tree` entries where `path` ends with `module.json`. For each file found, fetch and parse it.

**Format**: a JSON array of module objects. Each object has:
- `ModuleSettings.ModuleId` — the module ID (e.g. `(infraops)properties`)
- `DomDefinitions[]` — array of DOM definitions, each with `Name` and `SectionDefinitionLinks[]`
- `SectionDefinitions[]` — array of section definitions, each with `Name` and `FieldDescriptors[]`

Each `FieldDescriptor` has:
- `Name` — field name
- `FieldType` — the .NET type string (extract the simple type name, e.g. `System.String` → `String`)
- `IsOptional` — boolean
- `IsHidden` — boolean
- `IsSoftDeleted` — boolean (skip soft-deleted fields in the output)

### Layout B — Per-folder DOM files (package SetupContent layout)

Look for folders matching the pattern `**/SetupContent/DOM/`:

```
GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1
```

Filter paths containing `/SetupContent/DOM/`. The structure under this folder is:

```
SetupContent/DOM/
  {moduleId}/
    {moduleId}.json              ← module settings
    DomDefinitions/
      {guid}.json                ← one file per DomDefinition
    SectionDefinitions/
      {guid}.json                ← one file per SectionDefinition
    DomBehaviorDefinitions/
      {guid}.json                ← optional, skip for now
```

For each module folder found:
1. Read `{moduleId}.json` for module settings (module ID, name settings)
2. Read every file under `DomDefinitions/` — each has `Name` and `SectionDefinitionLinks[].SectionDefinitionID.Id`
3. Read every file under `SectionDefinitions/` — each has `Name` and `FieldDescriptors.$values[]`

Each `FieldDescriptor` in Layout B has:
- `Name`
- `FieldType` — extract simple name from the .NET type string
- `IsOptional`, `IsHidden`, `IsSoftDeleted`

> If both layouts are found in the same repository, process both and merge results under their respective module IDs.

## Building the Output

After discovery, compile the full schema into a markdown document with this structure:

```markdown
# DOM Schema — {REPO_NAME}
**Generated**: {date}
**Repository**: https://github.com/{owner}/{repo}
**Modules found**: {N}

---

## Module: `{moduleId}`

> **Source**: `{path to module.json or SetupContent/DOM folder}`

### DOM Definitions

| Definition | Sections linked |
|------------|----------------|
| {name} | {comma-separated section names} |

### Section Definitions

#### `{SectionDefinition name}`

| Field | Type | Optional | Hidden |
|-------|------|----------|--------|
| {name} | {SimpleType} | ✅ / — | ✅ / — |

---
```

Repeat the module block for every module found. Sort modules alphabetically by module ID. Within each module, sort section definitions alphabetically. Omit fields where `IsSoftDeleted: true`.

For the **Sections linked** column in the DOM Definitions table, resolve section definition GUIDs to their names using the SectionDefinitions you have already loaded.

If a `FieldType` contains a long .NET assembly-qualified name, extract only the meaningful part:
- `System.String` → `String`
- `System.Int64` → `Int64`  
- `System.Double` → `Double`
- `System.Boolean` → `Boolean`
- `System.DateTime` → `DateTime`
- `Skyline.DataMiner.Net.Apps.DataMinerObjectModel.DomInstanceId` → `DomInstanceId`
- `Skyline.DataMiner.Net.GenericEnumEntry` → `GenericEnum`
- For any other type, use the last segment after the last `.`

## Pre-run Discovery

Before writing any output:
1. Search `{solution repo}` for open issues and PRs with titles containing "DOM", "schema", or "dom-schema"
2. Read the existing matrix entry for this solution's `storage-objects` check — verify stored `issueUrl`/`prUrl` are still open; if closed/merged, treat as null
3. Record `existingIssueUrl` and `existingPrUrl` for use in Step 2

## Output Steps

### Step 1 — Write landscape report

Commit the DOM schema markdown to:
- Repository: `{REPORT_REPO}`
- Path: `{REPORT_PATH}` (e.g. `solutions/SLC-S-InfraOps/dom-schema.md`)

Fetch the file first to get its current SHA (required for updates).

### Step 2 — Update matrix

Update `matrix-data.json` in `leanderdruwel-skyline/solution-landscape`.

Find (or create) the solution entry in `solutions[]` by `id` matching the repository name.

Set `results["storage-objects"]` to:

```json
{
  "status": "{pass|partial|fail|unknown}",
  "summary": "{N} modules · {N} definitions · {N} section definitions · {N} fields",
  "checkedAt": "{ISO date}",
  "reportUrl": "https://github.com/{REPORT_REPO}/blob/main/{REPORT_PATH}",
  "issueUrl": "{existingIssueUrl or null}",
  "prUrl": "{existingPrUrl or null}"
}
```

**Status determination** (this agent is a mapper, not a validator — use these rules):
- `"pass"` if DOM modules were found and fully documented
- `"partial"` if an open PR exists, OR if some modules/definitions could not be fully parsed
- `"fail"` if no DOM definitions were found at all in a repo that is expected to have them
- `"unknown"` if the repository structure could not be determined

### Step 3 — Assist mode only

> Skip this step unless the user's prompt explicitly contains the words "assist mode".

If no `module.json` or `SetupContent/DOM/` folder is found and this is a solution repository that should have DOM definitions, open a GitHub issue on the solution repository:

- **Title**: `[DOM Schema] No DOM module definitions found`
- **Body**: explain that no `module.json` or `SetupContent/DOM/` layout was detected, and link to the DOM documentation
- **Label**: `dom-schema` (create label if it does not exist, color `#bc8cff`)
