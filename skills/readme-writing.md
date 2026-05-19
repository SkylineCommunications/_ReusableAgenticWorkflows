# README Writing

This skill defines how to gather project details and produce developer-oriented README documentation for DataMiner solution repositories. It covers both per-project READMEs and the repository root README.

---

## Gather Project Details

For each project in the inventory, collect the **generic details** (applicable to every project type) followed by **type-specific details** (varying per project type).

### Generic Details (all types)

1. **Summary** — Read source files to understand what the project does functionally. Write 2–6 sentences describing the purpose, with **key terms bold**. Avoid method-level detail.

1. **T-shirt Size** — Estimate the relative complexity of the project based on the number of source files and lines of code (XS, S, M, L, XL).

   | Size | Criteria |
   |------|----------|
   | XS | 1 source file, under 100 lines of code |
   | S | 2–5 source files or under 500 lines of code |
   | M | 6–15 source files or 500–2000 lines of code |
   | L | 16–30 source files or 2000–5000 lines of code |
   | XL | 30+ source files or 5000+ lines of code |

1. **Catalog Reference** — Only applicable if the project generates a deployable DataMiner package (i.e. has `<GenerateDataMinerPackage>True</GenerateDataMinerPackage>`). If so, check if the project has a `CatalogInformation/` folder containing a `manifest.yml`. If present, read the `id` field (Catalog GUID) and the `title` field (Catalog item name). If no `manifest.yml` exists or `id` is empty, this project has no Catalog reference.

### Type-Specific Details

After collecting the generic details, gather additional data points based on the project type. If a project type is not listed below, no additional details are needed.

#### Ad-Hoc Data Source *(multi-instance)*

A single project may contain **multiple** ad-hoc data sources. Enumerate every class that implements `IGQIDataSource` and gather the following **per instance**:

| Data Point | How to Extract |
|------------|---------------|
| **Name** | Read the `[GQIMetaData(Name = "...")]` attribute on the class |
| **Summary** | Describe what this specific data source does (3–5 sentences from the `.cs` file) |
| **Library Name** | Read the `<Param type="libraryName">` value from the DMSScript XML file |
| **Implemented Interfaces** | List all GQI interfaces the class implements (starting with `IGQI`) |
| **Input Arguments** | Parse the `GetInputArguments()` method return value → table: Name, Type, Is Required, Description |
| **Output Columns** | Parse the `GetColumns()` method return value → table: Name, Type, Description |

#### Data Transformer *(multi-instance)*

Same multi-instance handling as Ad-Hoc Data Source. Enumerate every class implementing `IGQIRowOperator` and/or `IGQIColumnOperator`.

| Data Point | How to Extract |
|------------|---------------|
| **Name** | Read the `[GQIMetaData(Name = "...")]` attribute on the class |
| **Summary** | Describe what this transformer does (3–5 sentences from the `.cs` file) |
| **Library Name** | Read the `<Param type="libraryName">` value from the DMSScript XML file |
| **Implemented Interfaces** | List all GQI interfaces the class implements (starting with `IGQI`) |
| **Input Arguments** | Parse the `GetInputArguments()` method return value → table: Name, Type, Is Required, Description |
| **Operations** | Determine whether a row is added/updated or a column is added/updated based on the `IGQIRowOperator` / `IGQIColumnOperator` implementation → table: Operation (Add/Update), Target (Row/Column), Description |

#### User-Defined API *(multi-instance)*

A single project may expose **multiple** API endpoints. Enumerate every class annotated with `[AutomationEntryPoint(AutomationEntryPointType.Types.OnApiTrigger)]` and gather the following **per endpoint**:

| Data Point | How to Extract |
|------------|---------------|
| **Endpoints** | Detect route attributes. List each endpoint (path/route) and associated method(s). |
| **Input** | Inspect usage of `ApiTriggerInput` in the entry-point method — identify what fields of `requestData` are accessed, their expected types and structure |
| **Output** | Identify the response: status codes returned, type of data in the body, format (JSON, plain text, etc.) |
| **Supported Methods** | Determine which HTTP methods are handled (GET, PUT, POST, DELETE, etc.) from conditional logic on the request method |

#### Automation Shared Library

| Data Point | How to Extract |
|------------|---------------|
| **Library Name** | Read the `<Param type="libraryName">` value from the DMSScript XML file |
| **Consumers** | Scan **all** DMSScript XML files in the repository for `<Param type="scriptRef">{SCRIPTNAME}:{LIBRARYNAME}</Param>` where `{SCRIPTNAME}` is the name of the script containing this library and `{LIBRARYNAME}` matches the library name. List the consuming project names. |
| **Public API** | Summarize the publicly exposed interfaces, classes, properties, and methods from the `.cs` source files |

#### ChatOps Operator

| Data Point | How to Extract |
|------------|---------------|
| **Input Parameters** | Read `<ScriptParameter>` elements from the DMSScript XML → table: Name, Description, Format (e.g. `number`, `string`, `"agent id/element id"`) |
| **Output** | Describe what the script outputs by inspecting calls to `engine.AddSingularJsonOutput(` and `engine.AddScriptOutput()` — what data is returned and in what structure |

#### Interactive Automation Script

| Data Point | How to Extract |
|------------|---------------|
| **Toolkit** | Check if the `.csproj` references the `Skyline.DataMiner.Utils.InteractiveAutomationScriptToolkit` NuGet package. If found, add a note: *"Created with Interactive Automation Script Toolkit."* |
| **Dialogs** | Identify all classes inheriting from `Dialog` or `Section` in the `.cs` files. For each dialog/screen, describe its purpose and the key controls it presents (buttons, text fields, dropdowns, etc.) |

#### Automation Script

| Data Point | How to Extract |
|------------|---------------|
| **Purpose** | Determine whether the script is user-facing (launched by operators) or an internal helper (called by other scripts or triggered automatically) |
| **Interactions** | Identify interactions with DataMiner objects: elements (note the protocol name), views, services, profiles, alarms, correlation rules |
| **Input Parameters** | Read `<ScriptParameter>` elements from the DMSScript XML **and** `GetScriptParam` calls in the `.cs` files → table: Name, Description, Format (e.g. `number`, `string`, `"agent id/element id"`) |

#### Connector

| Data Point | How to Extract |
|------------|---------------|
| **Communication Type** | Read the connection type from the Protocol XML (SNMP, HTTP, serial, etc.) |
| **Pages** | List all UI pages defined in the Protocol XML with a brief summary of each |
| **Tables** | For each table: Description/Name, Parameter ID, list of column names |
| **Timers** | List each timer with its interval and what group(s) it triggers |

#### NuGet Project

| Data Point | How to Extract |
|------------|---------------|
| **Assembly Name** | Read the `<AssemblyName>` property from the `.csproj` file |
| **Public API** | Summarize the publicly exposed interfaces, classes, properties, and methods from the `.cs` source files |

#### Shared Project

| Data Point | How to Extract |
|------------|---------------|
| **Referenced By** | Scan all `.csproj` files in the repository for `<Import Project="...">` or `<ProjectReference Include="...">` entries that point to this shared project's `.shproj` or `.projitems` file. List the referencing project names. |
| **Public API** | Summarize the publicly exposed interfaces, classes, properties, and methods from the `.cs` source files |

---

## Write Project READMEs

For **each project**, create or update `README.md` at the project root (same directory as the `.csproj`) using a **generic header** followed by a **type-specific body**.

### Generic Header (all types)

Every project README starts with this structure:

```markdown
# {ProjectName}

**Project Type**: {ProjectType}

**Size**: {TShirtSize}

{Only if Catalog Reference found: **Catalog Item**: [{Catalog item name}](https://catalog.dataminer.services/details/{catalog-item-guid})}

## Summary

{2–6 sentences describing the project purpose. Key terms in **bold**.}
```

### Type-Specific Body

After the generic header, append the type-specific sections below. If the project type is not listed, no additional sections are needed.

#### Ad-Hoc Data Source

For each ad-hoc data source instance, add a section:

```markdown
## {DataSourceName}

{3–5 sentence summary of this data source.}

**Library Name**: {libraryName}

**Interfaces**: {comma-separated list of IGQI interfaces}

### Input Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|

### Output Columns

| Name | Type | Description |
|------|------|-------------|
```

#### Data Transformer

For each data transformer instance, add a section:

```markdown
## {TransformerName}

{3–5 sentence summary of this transformer.}

**Library Name**: {libraryName}

**Interfaces**: {comma-separated list of IGQI interfaces}

### Input Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|

### Operations

| Operation | Target | Description |
|-----------|--------|-------------|
```

#### User-Defined API

For each API endpoint, add a section:

```markdown
## {EndpointName}

{3–5 sentence summary of this endpoint.}

### Supported Methods

{List of HTTP methods: GET, PUT, POST, DELETE, etc.}

### Input

{Description of requestData fields, their types, and structure.}

### Response

| Status Code | Description | Body Format |
|-------------|-------------|-------------|
```

#### Automation Shared Library

```markdown
## Library Info

**Library Name**: {libraryName}

### Consumers

{Bulleted list of projects that reference this library, or "No consumers found in this repository."}

### Public API

{Summary of publicly exposed interfaces, classes, properties, and methods.}
```

#### ChatOps Operator

```markdown
## Input Parameters

| Name | Description | Format |
|------|-------------|--------|

## Output

{Description of the data returned via `engine.AddSingularJsonOutput` / `engine.AddScriptOutput` and its structure.}
```

#### Interactive Automation Script

```markdown
{If toolkit detected: > add note alert:"Created with Interactive Automation Script Toolkit."}

## Dialogs

| Dialog | Purpose | Key Controls |
|--------|---------|--------------|
```

#### Automation Script

```markdown
## Purpose

{User-facing or internal helper. Brief description of when and how the script is used.}

## Interactions

{Bulleted list of DataMiner objects the script interacts with: elements (protocol name), views, services, profiles, alarms, correlation rules.}

## Input Parameters

| Name | Description | Format |
|------|-------------|--------|
```

If there are no input parameters, state: *This script has no input parameters.*

#### Connector

```markdown
## Communication

**Type**: {SNMP, HTTP, serial, etc.}

## Pages

| Page | Description |
|------|-------------|

## Tables

| Name | ID | Columns |
|------|-----|---------|

## Timers

| Timer | Interval | Description |
|-------|----------|-------------|
```

#### NuGet Project

```markdown
## Assembly

**Assembly Name**: {assemblyName}

## Public API

{Summary of publicly exposed interfaces, classes, properties, and methods.}
```

#### Shared Project

```markdown
## Referenced By

{Bulleted list of projects that import this shared project, or "No references found in this repository."}

## Public API

{Summary of publicly exposed interfaces, classes, properties, and methods.}
```

### Project README Rules

- If the project already has a `README.md`, preserve any content that is still accurate and update sections that are stale or missing.
- For multi-instance types (Ad-Hoc Data Source, Data Transformer, User-Defined API), the project-level Summary comes first, followed by one `## {InstanceName}` section per detected instance.

---

## Write Root README

Summarize all discovered projects in the repository root README.

Find information on the project README files that were created as part of the project READMEs step:
1. **Project**: Identify the name as the project name.
1. **Description**: Identify the description as a one sentence summary of the project description.
1. **Catalog Reference**: If the project has a Catalog reference, include the Catalog item name and link to the Catalog page as a tip-alert.

Create or update `README.md` at the repository root using the following structure:

```markdown
# {RepositoryName}

{Repository goal: 1–4 sentences describing the purpose of the **repository**.}

> [!TIP]
> The outcome of this repository is available in the Catalog: [{Catalog item name} | Catalog | dataminer.services](https://catalog.dataminer.services/details/{catalog-item-guid})

## Projects

{Group projects into logical sections based on their type.}

### {Group Name}

| Project | Description |
|---------|-------------|
| [{ProjectName}]({ProjectFolder}/README.md) | {One-sentence description} |
```

### Root README Rules

- Include the Catalog TIP alert only if a `manifest.yml` with a non-empty `id` and `title` field is present. If there is no Catalog item, omit the TIP block entirely.
- Group projects into sections linked to their project type.
- For repositories with fewer than 5 projects, list all projects in a single `## Projects` table with no sub-grouping, and add the project type as a column instead.
- If the root README already exists, preserve the repository goal description if it is still accurate, and update the Projects section to reflect the current project list.
- Use URL-encoded spaces in paths (e.g. `GQI%20Shared/README.md`) for project folders whose names contain spaces.

---

## General Constraints

- Maximum verbosity: the Summary section per project must be **at most 6 sentences**. The root repository goal must be **at most 4 sentences**.
- Do not modify `CatalogInformation/README.md` — that file is NOT managed by this skill.
- If a project root already has a fully accurate `README.md` that follows the structure above, leave it unchanged.
