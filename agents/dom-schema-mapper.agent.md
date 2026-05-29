---
name: DOM Schema Mapper
description: "Scans a DataMiner solution repository and produces a structured markdown catalogue of all DOM modules, definitions, section definitions, and fields that the solution accesses — supporting both FleetOps-style (DomCache/DomHelper + GetSectionDefinitionByName) and InfraOps-style (typed DomIds.cs constants) access patterns."
---

# DOM Schema Mapper

You are a documentation agent. When run on a DataMiner solution repository, map every DOM module the solution accesses and produce a human-readable catalogue of the schema.

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

DOM (DataMiner Object Model) has two layers:

**1 — Schema definition (install-time)**
JSON files deployed with the package define the modules, definitions, section definitions, and field descriptors — including their fixed GUIDs. These tell you what a solution *owns*. Some solutions define the schema entirely in code via a generated `DomIds.cs` file.

**2 — Runtime access (code)**
Two access patterns exist across standard solutions:

**Pattern A — FleetOps-style (dynamic string-based):**
```csharp
new DomHelper(engine.SendSLNetMessages, "(slc)fleet_ops")   // module ID literal
new DomCache(dms, "(slc)people_organizations")              // cross-solution access

domCache.GetSectionDefinitionByName("Vehicle info")
domCache.GetFieldDescriptorByName("Vehicle info", "VIN")
instance.GetFieldValue<string>(secDef, fieldDef)
```

**Pattern B — InfraOps-style (typed DomIds.cs constants):**
```csharp
// Schema defined in auto-generated DomIds.cs:
public static class SlcAsset_Management {
    public const string ModuleId = "(slc)asset_management";
    public static class Sections {
        public static class AssetInformation {
            public static FieldDescriptorID AssetClass = new FieldDescriptorID(new Guid("..."));
        }
    }
}

// Access in code:
SlcAsset_Management.Sections.AssetInformation.AssetClass   // section + field
infraOpsHandler.AssetManagementHandler.DomHelper.Instances.Read(...)
```

**This agent scans code for both patterns.** The schema source depends on the pattern:
- Pattern A: schema from `module.json` / `DOM.zip`; module IDs from `new DomCache/DomHelper(...)` calls
- Pattern B: schema from `DomIds.cs` / `GeneratedDomIds.cs`; module IDs from `public const string ModuleId`

A solution can access DOM modules it does not install (not installed here dependencies). These must be clearly distinguished in the output.

## Step 1 — Collect files

For performance, **prefer a local clone** over individual API calls.

If a local clone is available: use `os.walk` / `Path.rglob` to list files directly from disk.
If using GitHub API: `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`

Collect:
- All `.cs` files
- `module.json` (any path)
- `DOM.zip` (any path — contains `module.json`)
- `DomIds.cs` and `GeneratedDomIds.cs` (schema files for Pattern B)
- LCA zip files under `PackageContent/LowCodeApps/` (skip `WithDependencies` packages)

**Pre-filter .cs files** before deep scanning: only process files that contain at least one of:
`DomCache`, `DomHelper`, `GetSectionDefinitionByName`, `GetFieldDescriptorByName`, `GetFieldValue`, `FieldDescriptorID`, `SectionDefinitionID`, `.Sections.`

This reduces scan scope from thousands to hundreds of files.

## Step 2A — Load schema from install JSON (Pattern A)

Load `module.json` from all three storage layouts:

| Layout | What to look for |
|--------|----------------|
| **A** — loose file | paths ending in `module.json` (decode with `utf-8-sig`) |
| **B** — per-folder | paths containing `/SetupContent/DOM/` |
| **C** — zip | paths ending in `DOM.zip` (extract `module.json`; decode with `utf-8-sig`) |

From the JSON, populate:
- `owned_module_ids` — set of module IDs installed by this solution
- `owned_schema[module][section][field]` = type
- `dom_def_map[def_guid]` = definition name
- `field_desc_guid_map[fd_guid]` = field name
- `section_id_map[sec_guid]` = section name (**see gotcha below**)
- `def_to_sections[(module, def_name)]` = list of section GUIDs (from `SectionDefinitionLinks`)
- `def_to_fields[(module, def_name)]` = set of field names (expanded via section_id_map)

> ⚠️ **Key gotcha — `SectionDefinitions` GUID field uses `ID` (uppercase), NOT `Id`:**
> ```python
> # WRONG — always returns None:
> sec_id = sd.get('Id', {}).get('Id', '')
>
> # CORRECT — handles both casing variants:
> sec_id = (sd.get('ID') or sd.get('Id') or {}).get('Id', '')
> ```
> This is the top cause of empty `def_to_fields` maps and all fields showing `None` for Frontend access.
>
> Note: `DomDefinitions[].Id.Id` uses lowercase `Id` (not `ID`) — only `SectionDefinitions` uses uppercase.

## Step 2B — Parse DomIds.cs (Pattern B)

When `DomIds.cs` or `GeneratedDomIds.cs` files are present, parse them to extract the full schema.
These are auto-generated files with a fixed structure:

```csharp
public static class SlcAsset_Management          // outer class = module
{
    public const string ModuleId = "(slc)asset_management";

    public static class Sections
    {
        public static class AssetInformation     // section name
        {
            public static SectionDefinitionID Id { get; }
                = new SectionDefinitionID(new Guid("...")) { ModuleId = "..." };
            public static FieldDescriptorID AssetClass { get; }   // field name
                = new FieldDescriptorID(new Guid("..."));
        }
    }

    public static class Definitions
    {
        public static DomDefinitionId Asset { get; }   // definition name
            = new DomDefinitionId(new Guid("9035d110-..."));
    }
}
```

**Parser requirements:**
- Track class nesting using brace counting + a class stack
- Handle **Allman-style braces**: class declaration and `{` on separate lines
  (e.g., `public static class Foo` on line N, `{` on line N+1)
  → keep a `pending_class` variable: set when a class line with no `{` is seen, consume on next `{`
- Map outer class name → `public const string ModuleId` value (class_to_module)
- Within `Sections` inner class: each sub-class is a section; `FieldDescriptorID` properties are fields
- Within `Definitions` inner class: `DomDefinitionId` properties → GUIDs on next few lines
- Populate `dom_def_map`, `def_to_fields` (all module fields reachable from any definition)

Modules defined in DomIds.cs but absent from module.json are **code-installed** — mark "Created by: code".

## Step 2C — Scan code for DOM access (both patterns)

### Pattern A — string-based access

| Pattern | What to extract |
|---------|----------------|
| `new DomHelper(..., "moduleId")` | module ID |
| `new DomCache(..., "moduleId")` | module ID |
| `new DomCache(..., ConstName)` | resolve const → module ID |
| `GetSectionDefinitionByName("section")` | section name |
| `GetFieldDescriptorByName("section", "field")` | section name + field name |
| `GetFieldValue<T>(cache, record, "section", "field")` | section name + field name + **type from `T`** |
| `secDefVar = cache.GetSectionDefinitionByName("section")` | tracks secDefVar → (cache, section) |
| `fdVar = secDefVar.GetFieldDescriptorByName("field")` | tracks fdVar → (secDefVar, field) |
| `GetFieldValue<T>(secDefVar, fdVar)` | resolve chain → module/section/field/**type** |
| `secDefVar = obj.PropName.GetSectionDefinitionByName("section")` | property-chain — resolve `PropName` via global property→module map |
| `obj.PropName.GetFieldDescriptorByName("section", "field")` | property-chain direct field access |

### Pattern B — typed constant access

```
ModuleClass.Sections.SectionName.FieldName
```
Regex: `\b(\w+)\.Sections\.(\w+)\.(\w+)\b`
- `\w+` must match a key in `class_to_module` (e.g., `SlcAsset_Management` → `(slc)asset_management`)
- `SectionName` = section name
- `FieldName` = field name (skip `Id` — that is the `SectionDefinitionID`, not a data field)

### Scanner notes — variable→module resolution

> **Use per-file scope.** Build a fresh `var → module` map for each `.cs` file. In addition, build a **global property→module map** by scanning all files for `PropName = new DomCache(..., moduleId)` assignments (object initializer form). This covers patterns like `helper.DomCache` where `DomCache` is a class property mapped to a specific module. Never merge variable assignments across files — the same name (e.g. `domCache`) may refer to different modules in different files.

**Variable→module resolution priority (Pattern A):**
1. `var = new DomCache(..., "literal-module-id")` — direct literal match.
2. `var = new DomCache(..., ConstName)` — resolve `const string ConstName = "..."` in same file first, then global consts.
3. **Do NOT** include `DomCache paramName` method-parameter declarations — causes false attribution.

**GetInstanceById / .Name access:**
`GetInstanceById(guid).Name` reads the DOM instance's built-in `Name` property, not a field descriptor. Note it as `(instance.Name)` in the report.

**LCA Join branches:**
When walking GQI query trees in LCA zips, recurse into `Join → Options[ID='On'].Value` — this sub-object is a raw `DMAGenericInterfaceQuery`, not a `DMAPrimitiveValue`. Access it directly and collect module/definition from the joined branch.

## Step 3 — Scan Low-Code Apps for direct DOM queries

LCA zip files under `PackageContent/LowCodeApps/` may contain GQI queries that access DOM storage directly from the UI. Skip `WithDependencies` packages to avoid duplicates.

1. For each LCA zip: extract `content.zip` → read `App.config.json` (decode with `utf-8-sig`)
2. Walk `DataPool[].Query` nodes recursively; look for `ID='Object manager'` nodes
3. Collect: module ID, definition GUIDs, column IDs per query

**Marking fields as Frontend-accessible:**
- Resolve definition GUIDs via `dom_def_map`
- Look up `def_to_fields[(module, def_name)]` → all fields reachable from that definition
- Mark those fields as Frontend-accessible for the `Direct access` column
- **Do NOT rely on column ID resolution** — LCA column IDs are field descriptor GUIDs not present in install JSON for most solutions. Instead use the definition→fields expansion above.

## Step 4 — Build the output

```markdown
# DOM Schema — {REPO_NAME}
**Generated**: {date}
**Repository**: https://github.com/{owner}/{repo}
**Modules accessed**: {N} ({N} installed by this solution, {N} not installed here)

---

## Module: `{moduleId}`
**Created by**: {JSON | code | JSON + code | not installed here} — _{note}_

### Sections accessed

#### `{Section name}`

| Field | Type | Direct access | Created by |
|-------|------|---------------|------------|
| {name} | {type or —} | {Backend | Frontend | Back + Frontend | None} | {JSON | code | JSON + code | ⚠️ not in install package | None} |
```

### Column: Direct access

| Value | Meaning |
|-------|---------|
| `Backend` | Field is read/written in C# code only |
| `Frontend` | Field is queried by a Low-Code App GQI query only |
| `Back + Frontend` | Field accessed from both code and LCA |
| `None` | Field is defined (in install JSON or DomIds.cs) but not accessed anywhere |

### Column: Created by (field level)

| Value | Meaning |
|-------|---------|
| `JSON` | Field defined in install JSON (`module.json` / `DOM.zip`) |
| `code` | Field defined in `DomIds.cs` (code-installed module) |
| `JSON + code` | Field present in both JSON and code-create patterns |
| `⚠️ not in install package` | Field accessed in code but absent from install JSON — schema drift |
| `None` | Module not installed by this solution |

- Sort modules alphabetically; sort sections and fields alphabetically within each module
- If field type is not resolvable, leave as `—`

## Step 4b — LCA direct access table

```markdown
## Direct DOM access from Low-Code App

> ⚠️ **These queries bypass the solution API and access DOM storage directly from the UI.**
> Prefer reading data through UDAPI/GQI data sources exposed by the solution.

| Query name | Module | Definitions | Columns selected | Join module | Join definitions | Join columns |
|------------|--------|-------------|-----------------|-------------|-----------------|--------------|
| {name} | {module} | {definition} | {cols} | {join_mod} | {join_defs} | {join_cols} |
```

## Step 5 — Write report

Commit the markdown to `{REPORT_REPO}` at `{REPORT_PATH}`. Fetch the file first to get its SHA if it already exists.

## Step 6 — Update matrix

In `matrix-data.json` in `leanderdruwel-skyline/solution-landscape`, set `results["dom-schema"]` for the solution:

```json
{
  "status": "pass | partial | fail | unknown",
  "summary": "{N} modules ({N} installed, {N} not installed here) · {N} sections · {N} fields · {N} direct LCA queries",
  "checkedAt": "{ISO date}",
  "reportUrl": "https://github.com/{REPORT_REPO}/blob/main/{REPORT_PATH}",
  "issueUrl": null,
  "prUrl": null
}
```

- `pass` — modules found and fully documented
- `partial` — some sections/fields could not be resolved (e.g. unresolved GUIDs)
- `fail` — no DOM access found in a solution expected to use DOM
- `unknown` — repository structure could not be determined
