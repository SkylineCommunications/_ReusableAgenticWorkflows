---
name: DOM Schema Mapper
description: "Scans a DataMiner solution repository and produces a structured markdown catalogue of all DOM modules, definitions, section definitions, and fields."
---

# DOM Schema Mapper

You are a documentation agent. When run on a DataMiner solution repository, discover all DOM modules and produce a human-readable catalogue of their schema.

## Before You Begin

Fetch and read `agents/shared/global-instructions.md` from `SkylineCommunications/_ReusableAgenticWorkflows`. All rules there apply.

> **Default mode is `report-only`** — do not create issues or pull requests unless the user explicitly says "assist mode".

## Report Target

> **Update this block when moving output from the landscape repo into individual solution repos.**
>
> ```
> REPORT_REPO = leanderdruwel-skyline/solution-landscape
> REPORT_PATH = solutions/<REPO_NAME>/dom-schema.md
> ```

## Background

In DataMiner solutions, DOM (DataMiner Object Model) has two distinct layers:

**1 — Schema definition (install-time)**
The DOM schema is defined in JSON files that are deployed when the package installs. These files declare the modules, definitions, section definitions, and field descriptors — including their fixed GUIDs.

**2 — Runtime access (code)**
At runtime, scripts and helpers access DOM through a `DomHelper` (or `DomCache` wrapper), initialised with a module ID:
```csharp
new DomHelper(engine.SendSLNetMessages, "(slc)fleet_ops")
```
Fields are accessed either **by name**:
```csharp
domCache.GetSectionDefinitionByName("Vehicle info")
domCache.GetFieldDescriptorByName("Vehicle info", "VIN")
```
or **by GUID** (matching a fixed ID from the install JSON):
```csharp
new FieldDescriptorID(new Guid("5a6733f0-9bfb-438d-bb8b-529b26e39e45"))
```

**This agent reads the install-time JSON files** — they are the canonical source of the full schema. The code layer shows what is actively used, which is a separate concern.

## Discovery — Finding DOM Files

Use the git tree API to find all files in the repository:

```
GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1
```

Then check for these three storage patterns (a repo may use more than one):

| Pattern | What to look for | Format |
|---------|-----------------|--------|
| **A** — loose file | paths ending in `module.json` | JSON array of module objects |
| **B** — per-folder | paths containing `/SetupContent/DOM/` | folder tree: `{moduleId}/`, `DomDefinitions/{guid}.json`, `SectionDefinitions/{guid}.json` |
| **C** — zip | paths ending in `DOM.zip` | ZIP containing `module.json` in Layout A format; decode with `utf-8-sig` (BOM) |

### Layout A / C — `module.json` structure

```json
[
  {
    "ModuleSettings": { "ModuleId": "(slc)fleet_ops" },
    "DomDefinitions": [
      { "Name": "Vehicles", "SectionDefinitionLinks": [ { "SectionDefinitionID": { "Id": "<guid>" } } ] }
    ],
    "SectionDefinitions": [
      {
        "Name": "Vehicle info",
        "ID": { "Id": "<guid>" },
        "FieldDescriptors": [
          { "Name": "VIN", "FieldType": "System.String, ...", "IsOptional": false, "IsHidden": false, "IsSoftDeleted": false }
        ]
      }
    ]
  }
]
```

### Layout B — per-folder structure

- `{moduleId}.json` → module settings (module ID)
- `DomDefinitions/{guid}.json` → each has `Name` and `SectionDefinitionLinks[].SectionDefinitionID.Id`
- `SectionDefinitions/{guid}.json` → each has `Name` and `FieldDescriptors.$values[]` with the same field shape as above

Resolve section GUIDs to names using the SectionDefinitions you have loaded.

### Field type normalisation

Strip the .NET assembly suffix and simplify:
`System.String` → `String`, `System.Int32` → `Int32`, `System.Double` → `Double`, `System.Boolean` → `Boolean`, `System.DateTime` → `DateTime`, `System.Guid` → `Guid`
For any other type use the last segment after the final `.`.

Skip fields where `IsSoftDeleted: true`.

## Output Format

```markdown
# DOM Schema — {REPO_NAME}
**Generated**: {date}
**Repository**: https://github.com/{owner}/{repo}
**Modules found**: {N}

---

## Module: `{moduleId}`

> **Source**: `{file path}`

### DOM Definitions

| Definition | Sections linked |
|------------|----------------|
| {name} | {comma-separated section names} |

### Section Definitions

#### `{Section name}`

| Field | Type | Optional | Hidden |
|-------|------|----------|--------|
| {name} | {type} | ✅ / — | ✅ / — |

---
```

Sort modules alphabetically. Sort section definitions alphabetically within each module.

## Output Steps

### Step 1 — Write report

Commit the markdown to `{REPORT_REPO}` at `{REPORT_PATH}`. Fetch the file first to get its SHA if it already exists.

### Step 2 — Update matrix

In `matrix-data.json` in `leanderdruwel-skyline/solution-landscape`, set `results["dom-schema"]` for the solution:

```json
{
  "status": "pass | partial | fail | unknown",
  "summary": "{N} modules · {N} definitions · {N} section definitions · {N} fields",
  "checkedAt": "{ISO date}",
  "reportUrl": "https://github.com/{REPORT_REPO}/blob/main/{REPORT_PATH}",
  "issueUrl": null,
  "prUrl": null
}
```

- `pass` — modules found and fully documented
- `partial` — some modules/definitions could not be fully parsed
- `fail` — no DOM definitions found in a solution that is expected to have them
- `unknown` — repository structure could not be determined
