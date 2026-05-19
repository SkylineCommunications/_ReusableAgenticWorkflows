# Project Type Identification

This skill identifies and classifies all projects within a DataMiner solution repository. It produces a typed inventory of projects that other skills (such as README writing) consume.

---

## Identify Projects

Read the repository root to identify all folders that contain a project. A folder is considered a **Visual Studio project** if it contains a `.csproj` or `.shproj` file. Among Visual Studio projects, give special attention to **DataMiner SDK projects**: these use `<Project Sdk="Skyline.DataMiner.Sdk">` and have a `<DataMinerType>Package</DataMinerType>` property group. These projects represent deployable DataMiner packages.

---

## Detect Project Types

Project types can be determined from three independent sources. Check **all three** for every project; if the sources disagree, include a warning in the output noting the conflict so a human can resolve it.

### Source A — Source code patterns

Inspect the source files in the project directory for code-level indicators:

| Code Pattern | Project Type |
|---|---|
| C# file (`.cs`) implementing `IGQIDataSource` | Ad-Hoc Data Source |
| C# file (`.cs`) implementing `IGQIRowOperator` and/or `IGQIColumnOperator` | Data Transformer |
| C# file (`.cs`) containing `[AutomationEntryPoint(AutomationEntryPointType.Types.OnApiTrigger)]` | User-Defined API |
| DMSScript XML file containing both `<Param type="preCompile">` and `<Param type="libraryName">` | Automation Shared Library |
| DMSScript XML file with `<Folder>` tag value equal to `bot` or starting with `bot/` | ChatOps Operator |
| DMSScript XML file AND C# file containing any of: `engine.ShowUI(`, `engine.RunClientProgram(`, `engine.ShowProgress(`, `engine.FindInteractiveClient(`, `engine.IsInteractive` | Interactive Automation Script |
| DMSScript XML file | Automation Script |
| Protocol XML file (root element `<Protocol>`) | Connector |
| `.csproj` with `<Project Sdk="Microsoft.NET.Sdk">` and an `<AssemblyName>` property | NuGet Project |
| `.shproj` file present | Shared Project |
| `.csproj` with `<DataMinerType>TestPackage</DataMinerType>` | QAOPS Test Package |
| `.csproj` referencing test frameworks (MSTest, NUnit, xUnit) or folder/name containing `Test`/`Spec` | Test Project |

Apply rules in the order listed above; use the **first** match.

For **DMSScript XML** detection: a file is a DMSScript XML file if its root element is `<DMSScript>`.
For **Protocol XML** detection: a file is a Protocol XML file if its root element is `<Protocol>`.

### Source B — `manifest.yml` type field

Look for a `manifest.yml` in the project's `CatalogInformation/` folder. If present, read the `type` field.

If no manifest file exists or the `type` field is absent, this source yields no result.

### Source C — `.csproj` DataMinerType property

Inspect the `.csproj` file for a `<DataMinerType>` element in a `<PropertyGroup>`. If the `.csproj` has no `<DataMinerType>` element, this source yields no result.

### Reconciliation

Use the source order **A → B → C** to determine the final project type. Prefer the result from the earliest source that yields a result.

---

## Output

The output of this skill is a **project inventory**: a list of all identified projects, each annotated with:

| Field | Description |
|-------|-------------|
| **Project Name** | The folder name containing the project |
| **Project Path** | Relative path from repository root to the project folder |
| **Project File** | Name of the `.csproj` or `.shproj` file |
| **Project Type** | The resolved type from the reconciliation step |
| **Type Sources** | Which sources (A, B, C) contributed a result, and any conflicts |
| **Is SDK Project** | Whether this is a DataMiner SDK project |
